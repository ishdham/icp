import { db } from '../config/firebase'; // Access firebase-admin db from config to avoid circular dependency
import { SolutionSchema, solutionJsonSchema } from '@shared/schemas/solutions';
import dotenv from 'dotenv';
import { z } from 'zod';

// Genkit Imports
import { genkit, z as genkitZ } from 'genkit';
import { vertexAI, gemini15Flash, gemini15Pro, textEmbedding004 } from '@genkit-ai/vertexai';


dotenv.config();

// Initialize Genkit
export const ai = genkit({
    plugins: [
        vertexAI({ location: 'us-central1', projectId: 'icp-demo-480309' }),
    ],
});

// Simple in-memory vector store interface
interface VectorDocument {
    id: string;
    type: 'solution' | 'partner';
    content: string;
    metadata: Record<string, any>;
    embedding: number[];
    score?: number;
}

export class AIService {
    private vectorStore: VectorDocument[] = [];
    private isInitialized = false;

    constructor() {
        // Genkit is initialized globally above
    }

    async initialize() {
        if (this.isInitialized) return;
        console.log('Initializing AI Service: loading and vectorizing data...');

        try {
            await this.refreshIndex();
            this.isInitialized = true;
            console.log(`AI Service Initialized. Index contains ${this.vectorStore.length} documents.`);
        } catch (error) {
            console.error('Failed to initialize AI Service:', error);
        }
    }

    private async refreshIndex() {
        // Fetch ALL Solutions
        const solutionsSnapshot = await db.collection('solutions').get();
        const solutions = solutionsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        // Fetch ALL Partners
        const partnersSnapshot = await db.collection('partners').get();
        const partners = partnersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        const newVectorStore: VectorDocument[] = [];

        // Simple batch processing to avoid rate limits if many items (for MVP just serial or small promise.all)
        // For MVP we will do them serially or in small batches.

        for (const sol of solutions) {
            // Only embed meaningful content if needed, but for search we want all.
            const content = `Solution: ${sol.name} (ID: ${sol.id}). Domain: ${sol.domain}. Description: ${sol.description}. Value Proposition: ${sol.uniqueValueProposition}.`;
            // Simplified embedding generation
            try {
                const embedding = await this.generateEmbedding(content);
                newVectorStore.push({
                    id: sol.id,
                    type: 'solution',
                    content: content,
                    metadata: sol,
                    embedding
                });
            } catch (e) {
                console.error(`Failed to embed solution ${sol.id}`, e);
            }
        }

        for (const partner of partners) {
            const content = `Partner: ${partner.organizationName} (ID: ${partner.id}). Type: ${partner.organisationType}. Description: ${partner.description}.`;
            try {
                const embedding = await this.generateEmbedding(content);
                newVectorStore.push({
                    id: partner.id,
                    type: 'partner',
                    content: content,
                    metadata: partner,
                    embedding
                });
            } catch (e) {
                console.error(`Failed to embed partner ${partner.id}`, e);
            }
        }

        this.vectorStore = newVectorStore;
    }

    public async upsertDocument(id: string, type: 'solution' | 'partner', data: any, content: string) {
        if (!this.isInitialized) await this.initialize();

        try {
            const embedding = await this.generateEmbedding(content);
            const doc: VectorDocument = {
                id,
                type,
                content,
                metadata: data,
                embedding
            };

            const existingIndex = this.vectorStore.findIndex(d => d.id === id);
            if (existingIndex >= 0) {
                this.vectorStore[existingIndex] = doc;
            } else {
                this.vectorStore.push(doc);
            }
            console.log(`Upserted document ${id} (${type}) to index.`);
        } catch (error) {
            console.error(`Failed to upsert document ${id}:`, error);
        }
    }

    public async removeDocument(id: string) {
        if (!this.isInitialized) await this.initialize();
        this.vectorStore = this.vectorStore.filter(d => d.id !== id);
        console.log(`Removed document ${id} from index.`);
    }

    public async indexEntity(id: string, type: 'solution' | 'partner', data: any) {
        let content = '';
        if (type === 'solution') {
            content = `Solution: ${data.name} (ID: ${id}). Domain: ${data.domain}. Description: ${data.description}. Value Proposition: ${data.uniqueValueProposition}.`;
        } else if (type === 'partner') {
            content = `Partner: ${data.organizationName} (ID: ${id}). Type: ${data.entityType || data.organisationType}. Description: ${data.description || ''}.`;
        }
        await this.upsertDocument(id, type, data, content);
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        // Cleaning text slightly
        const cleanText = text.replace(/\n/g, ' ');
        // Using real Vertex AI Embeddings via Genkit
        const result = await ai.embed({
            embedder: textEmbedding004,
            content: cleanText
        });
        return result[0].embedding;
    }

    // Cosine similarity search
    async search(
        query: string,
        options: {
            limit?: number;
            filters?: { type?: 'solution' | 'partner'; domain?: string; status?: string; proposedByUserId?: string };
            minScore?: number;
        } = {}
    ): Promise<VectorDocument[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { limit, filters, minScore = 0.4 } = options;

        const queryEmbedding = await this.generateEmbedding(query);

        // Filter first (by type/metadata)
        let candidates = this.vectorStore;
        if (filters) {
            if (filters.type) {
                candidates = candidates.filter(doc => doc.type === filters.type);
            }
            if (filters.type === 'solution' && filters.domain) {
                candidates = candidates.filter(doc => doc.metadata.domain === filters.domain);
            }
            if (filters.status) {
                candidates = candidates.filter(doc => doc.metadata.status === filters.status);
            }
            if (filters.proposedByUserId) {
                candidates = candidates.filter(doc => doc.metadata.proposedByUserId === filters.proposedByUserId);
            }
        }

        const scoredDocs = candidates.map(doc => {
            const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
            return { ...doc, score };
        });

        // Filter by minScore, Sort by score descending
        let results = scoredDocs
            .filter(d => d.score >= minScore)
            .sort((a, b) => b.score - a.score);

        if (limit) {
            results = results.slice(0, limit);
        }

        return results;
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }


    async chatStream(message: string, history: any[] = []) {
        if (!this.isInitialized) await this.initialize();

        // 1. Search for context (Mocked for now)
        const relevantDocs = await this.search(message, { limit: 20 }); // Returns top docs - Increased limit to 20 for better context
        const contextText = relevantDocs.map(d => d.content).join('\n---\n');

        // 2. Construct System Prompt with Context
        const systemInstruction = `You are a helpful AI assistant for the ICP (Innovation Co-Pilot) platform.
        Your goal is to help users find solutions and partners based on the Context provided below.
        
        CONTEXT:
        ${contextText}
        
        INSTRUCTIONS:
        - Answer the user's question based ONLY on the context provided.
        - If the answer is not in the context, say you don't have enough information.
        - Be concise and professional.
        - When referring to a Solution or Partner found in the context, YOU MUST create a Markdown link using the format:
          - For Solutions: [Solution Name](/solutions/ID)
          - For Partners: [Partner Name](/partners/ID)
        - Use the specific IDs provided in the context (e.g., "Solution: Name (ID: 123)").
        - Use standard Markdown for formatting (bold, lists, etc.).
        `;

        // Genkit Format History
        // history is [{role: 'user'|'model', content: string}]
        // Genkit wants MessageData[]

        const { stream } = await ai.generateStream({
            model: 'vertexai/gemini-2.5-flash',
            prompt: message,
            system: systemInstruction,
            // Note: Genkit history handling is different, usually managed via flow state or passed as 'messages'.
            // For simple streaming, we might need to construct the prompt with history or use the messages param if avail in this version.
            // We will prepend history to prompt or use messages if supported.
            messages: history.map(h => ({
                role: (h.role === 'ai' ? 'model' : 'user') as 'model' | 'user',
                content: [{ text: h.content }]
            })),
        });

        return stream;
    }

    async researchSolution(userPrompt: string) {
        if (!this.isInitialized) await this.initialize();

        try {
            // Pass 1: Grounded Research
            const researchPrompt = `
            You are an expert analyst. Your goal is to research and synthesize information for a "Solution" based on the user's request.
            
            REQUIRED INFORMATION TO GATHER:
            - Name
            - Summary (One line less than 200 characters)
            - Detailed Description
            - Unique Value Proposition (Benefit)
            - Cost and Effort
            - Return on Investment (ROI)
            - Domain (One of Water, Health, Energy, Education, Livelihood, Sustainability)
            - Status (One of PROPOSED, DRAFT, PENDING, APPROVED, MATURE, PILOT, REJECTED) - Default to PROPOSED
            - Launch Year
            - Target Beneficiaries (list of single phrases like Farmer, Women, Students, People with Disabilities, Amputeesetc)
            - References (Links)

            USER PROMPT:
            ${userPrompt}
            
            INSTRUCTIONS:
            1. Synthesize all information into a detailed, well-structured text summary.
            2. IMPORTANT: When listing References, ONLY use public, accessible HTTP/HTTPS URLs (e.g. official websites, news articles, PDFs). Do NOT use internal search links or grounding IDs.
            3. Use at most 5 high-quality sources to ensure timely results.
            `;

            console.log('Starting Research (Genkit)...');
            const researchResult = await ai.generate({
                model: 'vertexai/gemini-2.5-flash',
                prompt: researchPrompt,
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    googleSearchRetrieval: {}
                }
            });

            return {
                researchText: researchResult.text
            };

        } catch (error) {
            console.error('Research Error:', error);
            throw error;
        }
    }

    async extractStructuredData(researchText: string) {
        if (!this.isInitialized) await this.initialize();

        try {
            const formattingPrompt = `
            Take the following research text and reformat it exactly into the provided JSON schema.
            
            CRITICAL INSTRUCTIONS:
            - For 'domain', you MUST choose ONE single value that best fits from the allowed list (Water, Health, Energy, Education, Livelihood, Sustainability). Do NOT provide a list.
            - For 'status', you MUST choose ONE single value from the allowed list (PROPOSED, DRAFT, PENDING, APPROVED, MATURE, PILOT, REJECTED).
            - For 'launchYear', ensure it is an integer.
            
            TEXT:
            ${researchText}
            `;

            console.log('Starting Formatting (Genkit)...');

            const RelaxedSolutionSchema = SolutionSchema.partial();

            const finalResult = await ai.generate({
                model: 'vertexai/gemini-2.5-flash',
                prompt: formattingPrompt,
                output: {
                    schema: RelaxedSolutionSchema
                }
            });

            return finalResult.output;

        } catch (error: any) {
            console.error('Extraction Error:', error);
            // Check if it's a structural/validation error from Genkit
            if (error.status === 'INVALID_ARGUMENT' || error.message?.includes('schema')) {
                throw new Error(`Validation Failed: ${error.message}`);
            }
            throw error;
        }
    }
}

export const aiService = new AIService();
