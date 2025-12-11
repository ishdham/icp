import { db } from '../config/firebase'; // Access firebase-admin db from config to avoid circular dependency
import { SolutionSchema, solutionJsonSchema } from '../schemas/solutions';
import dotenv from 'dotenv';
import { z } from 'zod';

// Genkit Imports
import { genkit, z as genkitZ } from 'genkit';
import { vertexAI, gemini15Flash, gemini15Pro } from '@genkit-ai/vertexai';


dotenv.config();

// Initialize Genkit
const ai = genkit({
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
        // Fetch Solutions
        const solutionsSnapshot = await db.collection('solutions').where('status', '==', 'MATURE').get();
        const solutions = solutionsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        // Fetch Partners
        const partnersSnapshot = await db.collection('partners').where('status', 'in', ['APPROVED', 'MATURE']).get();
        const partners = partnersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        const newVectorStore: VectorDocument[] = [];

        // Simple batch processing to avoid rate limits if many items (for MVP just serial or small promise.all)
        // For MVP we will do them serially or in small batches.

        for (const sol of solutions) {
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

    private async generateEmbedding(text: string): Promise<number[]> {
        // Using text-embedding-004 via Genkit (requires configuring embedder, for now simplify or mock if not using strict Vertex embedding yet)
        // NOTE: Genkit requires configuring an embedder model. For simple migration step, we'll try to use a basic text generation or skip embedding if complex setup needed.
        // Assuming text-embedding-004 is available in Vertex or we can use a helper. 
        // For now, let's use a dummy embedding to unblock, or a model call if desired.
        // TODO: Properly implement Vertex Embedding with Genkit.
        return new Array(768).fill(0).map(() => Math.random());
    }

    // Cosine similarity search
    async search(query: string, limit: number = 3): Promise<VectorDocument[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        // Dummy search for now since embedding is mocked
        return this.vectorStore.slice(0, limit);
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
        const relevantDocs = await this.search(message, 5); // Returns top docs
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

    async extractSolution(history: any[], userPrompt?: string) {
        if (!this.isInitialized) await this.initialize();

        try {
            // Construct the conversation history text
            const conversationText = history.map(h => `${h.role}: ${h.content}`).join('\n');

            // Pass 1: Grounded Research
            const researchPrompt = `
            You are an expert analyst. Your goal is to research and synthesize information for a "Solution" based on the conversation history and any additional context.
            
            REQUIRED INFORMATION TO GATHER:
            - Name
            - Summary (One line)
            - Detailed Description
            - Unique Value Proposition (Benefit)
            - Cost and Effort
            - Return on Investment (ROI)
            - Domain (Water, Health, Energy, Education, Livelihood, Sustainability)
            - Status (PROPOSED, DRAFT, PENDING, APPROVED, MATURE, PILOT, REJECTED) - Default to PROPOSED
            - Launch Year
            - Target Beneficiaries
            - References (Links)

            CONVERSATION HISTORY:
            ${conversationText}
            
            USER PROMPT (if any):
            ${userPrompt || 'Research the solution details.'}
            
            INSTRUCTIONS:
            1. Synthesize all information into a detailed, well-structured text summary.
            2. IMPORTANT: When listing References, ONLY use direct, original source URLs.
            `;

            console.log('Starting Pass 1: Research (Genkit)...');
            // Using Gemini 2.5 Flash via Vertex
            const researchResult = await ai.generate({
                model: 'vertexai/gemini-2.5-flash',
                prompt: researchPrompt,
                config: {
                    temperature: 0.7
                }
            });
            const researchText = researchResult.text;
            console.log('Pass 1 Output:', researchText);

            // Pass 2: JSON Formatting
            const formattingPrompt = `
            Take the following text and reformat it exactly into the provided JSON schema.
            TEXT: ${researchText}
            `;

            console.log('Starting Pass 2: Formatting (Genkit)...');

            // Genkit can output structured data directly if schema is provided!
            // We use the Zod schema directly.

            const finalResult = await ai.generate({
                model: 'vertexai/gemini-2.5-flash',
                prompt: formattingPrompt,
                output: {
                    schema: SolutionSchema
                }
            });

            return finalResult.output;

        } catch (error) {
            console.error('Extraction Error:', error);
            throw error;
        }
    }
}

export const aiService = new AIService();
