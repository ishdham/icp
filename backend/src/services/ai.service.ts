import { db } from '../config/firebase';
import { SolutionSchema } from '@shared/schemas/solutions';
import { PartnerSchema } from '@shared/schemas/partners';
import { IAIService, ChatMessage, AiAttachment } from '../domain/interfaces/ai.interface';
import { Solution } from '../domain/entities/solution';
import { Partner } from '../domain/entities/partner';
import { ZodSchema } from 'zod';

// Removed direct Genkit imports

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

    constructor(private provider: IAIService) {
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
            // Enrichment: Include more fields for better grounding
            const content = this.composeContent('solution', sol);
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
            const content = this.composeContent('partner', partner);
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
        const content = this.composeContent(type, { ...data, id });
        await this.upsertDocument(id, type, data, content);
    }

    private composeContent(type: 'solution' | 'partner', data: any): string {
        if (type === 'solution') {
            return `Solution: ${data.name || ''} (ID: ${data.id}). Domain: ${data.domain || ''}. Status: ${data.status || ''}. Description: ${data.detail || data.description || ''}. Benefit: ${data.benefit || data.uniqueValueProposition || ''}. Cost: ${data.costAndEffort || ''}. ROI: ${data.returnOnInvestment || ''}.`
        } else {
            const loc = data.address ? `${data.address.city || ''}, ${data.address.country || ''}` : '';
            return `Partner: ${data.organizationName || ''} (ID: ${data.id}). Type: ${data.entityType || data.organisationType || ''}. Status: ${data.status || ''}. Location: ${loc}. Description: ${data.description || ''}.`;
        }
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        return this.provider.generateEmbedding(text);
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
        console.time('RAG-Total');
        if (!this.isInitialized) {
            console.time('RAG-Init');
            await this.initialize();
            console.timeEnd('RAG-Init');
        }

        // 0. Contextualize Query (Rewrite based on history)
        console.time('RAG-RefineQuery');
        const refinedQuery = await this.generateRefinedQuery(message, history);
        console.timeEnd('RAG-RefineQuery');
        console.log(`[RAG] Original: "${message}" -> Refined: "${refinedQuery}"`);

        // 1. Search with Refined Query
        console.time('RAG-Search');
        const relevantDocs = await this.search(refinedQuery, { limit: 15 }); // Increased limit slightly

        // 2. Format Context using RICH METADATA (not just similarity index content)
        const contextText = relevantDocs.map(d => this.formatContext(d)).join('\n---\n');
        console.timeEnd('RAG-Search');


        // 3. Construct System Prompt with Context
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

        // Map history to ChatMessage interface
        const chatHistory: ChatMessage[] = history.map(h => ({
            role: h.role === 'ai' ? 'model' : 'user',
            content: h.content
        }));

        console.timeEnd('RAG-Total');
        return this.provider.chatStream(systemInstruction, refinedQuery, chatHistory);
    }

    private async generateRefinedQuery(message: string, history: any[]): Promise<string> {
        if (!history || history.length === 0) return message;

        const recentHistory = history.slice(-3); // Optimization: Reduce to last 3 turns
        const conversationText = recentHistory.map(h => `${h.role === 'ai' ? 'Assistant' : 'User'}: ${h.content}`).join('\n');

        const prompt = `
        Given the following conversation history and the user's latest message, rewrite the user's message to be a standalone search query that captures all necessary context (like entities mentioned previously).
        
        Chat History:
        ${conversationText}
        
        Latest User Message: "${message}"
        
        Standalone Search Query (just the query text, no quotes):
        `;

        try {
            // Optimization: Timeout after 1.5s to prevent perceived slowness. Flash model should be fast.
            const timeoutPromise = new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error('Refinement timeout')), 1500)
            );

            const refinementPromise = this.provider.generateResponse(prompt);

            const refined = await Promise.race([refinementPromise, timeoutPromise]);
            return refined.trim() || message;
        } catch (e) {
            console.log('Query refinement skipped/failed:', e instanceof Error ? e.message : e);
            return message;
        }
    }

    private formatContext(doc: VectorDocument): string {
        const d = doc.metadata;
        if (doc.type === 'solution') {
            return `
            TYPE: Solution
            ID: ${doc.id}
            NAME: ${d.name}
            STATUS: ${d.status}
            DOMAIN: ${d.domain}
            SUMMARY: ${d.summary}
            DESCRIPTION: ${d.detail || d.description}
            BENEFIT: ${d.benefit || d.uniqueValueProposition}
            COST: ${d.costAndEffort}
            ROI: ${d.returnOnInvestment}
            LAUNCH YEAR: ${d.launchYear}
            TARGET: ${Array.isArray(d.targetBeneficiaries) ? d.targetBeneficiaries.join(', ') : d.targetBeneficiaries}
            `;
        } else {
            const addr = d.address ? `${d.address.city}, ${d.address.country}` : 'Unknown';
            const contact = d.contact ? `Email: ${d.contact.email}` : '';
            return `
            TYPE: Partner
            ID: ${doc.id}
            NAME: ${d.organizationName}
            STATUS: ${d.status}
            ENTITY TYPE: ${d.entityType || d.organisationType}
            LOCATION: ${addr}
            WEBSITE: ${d.websiteUrl}
            CONTACT: ${contact}
            DESCRIPTION: ${d.description}
            `;
        }
    }

    async researchEntity(userPrompt: string, type: 'solution' | 'partner' = 'solution', attachments?: AiAttachment[]) {
        console.log(`Starting Research for ${type}...`);

        // Conflict Check
        const detectedType = await this.detectEntityType(userPrompt, attachments);
        let warning: string | undefined;

        if (detectedType && detectedType !== type) {
            warning = `Based on the provided info, this looks like a ${detectedType.toUpperCase()}, but you selected ${type.toUpperCase()}.`;
        }

        const instructions = this.getResearchInstructions(type);
        const researchText = await this.provider.researchTopic(userPrompt, instructions, attachments);

        return {
            researchText,
            warning,
            detectedType
        };
    }

    // Alias for backward compatibility if needed, or remove and update usage
    async researchSolution(userPrompt: string) {
        return this.researchEntity(userPrompt, 'solution');
    }

    private async detectEntityType(prompt: string, attachments?: AiAttachment[]): Promise<'solution' | 'partner' | undefined> {
        // We use the prompt text for classification. 
        // Future: could use mm-model if prompt is empty but attachment is present.
        if (!prompt && (!attachments || attachments.length === 0)) return undefined;

        const detectionPrompt = `
        Analyze the text below. Is it describing a "Solution" (product, technology, intervention, project) OR a "Partner" (organization, company, NGO, university)?
        
        Text: "${prompt}"
        
        Return ONLY "SOLUTION" or "PARTNER". If ambiguous, return "UNKNOWN".
        `;

        try {
            const result = await this.provider.generateResponse(detectionPrompt);
            const clean = result.trim().toUpperCase();
            if (clean.includes('SOLUTION')) return 'solution';
            if (clean.includes('PARTNER')) return 'partner';
            return undefined;
        } catch (e) {
            console.warn('Entity detection failed:', e);
            return undefined;
        }
    }

    private getResearchInstructions(type: 'solution' | 'partner'): string {
        if (type === 'partner') {
            return `
            REQUIRED INFORMATION TO GATHER:
            - Organization Name
            - Entity Type (One of: NGO, Social Impact Entity, Academic, Corporate)
            - Website URL
            - Contact Email and Phone
            - Address (City, Country)
            - Status (One of PROPOSED, APPROVED, REJECTED, MATURE) - Default to PROPOSED
            - Description (Mission, key activities, background - detailed)
            
            INSTRUCTIONS:
            1. Synthesize all information into a detailed summary.
            2. Infer Entity Type from context if not explicit.
            3. Ensure City and Country are extracted if available.
            `;
        }

        return `
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

            INSTRUCTIONS:
            1. Synthesize all information into a detailed, well-structured text summary.
            2. IMPORTANT: When listing References, ONLY use public, accessible HTTP/HTTPS URLs (e.g. official websites, news articles, PDFs). Do NOT use internal search links or grounding IDs.
            3. Use at most 5 high-quality sources to ensure timely results.
        `;
    }

    async extractStructuredData(researchText: string, type: 'solution' | 'partner' = 'solution') {
        console.log(`Starting Formatting for ${type}...`);

        if (type === 'partner') {
            return this.provider.extractStructuredData(researchText, PartnerSchema.partial());
        } else {
            return this.provider.extractStructuredData(researchText, SolutionSchema.partial());
        }
    }

    async translateText(text: string, targetLanguage: string): Promise<string> {
        return this.provider.translateText(text, targetLanguage);
    }

    async translateStructured<T>(data: any, targetLanguage: string, schema?: ZodSchema<T>): Promise<T> {
        return this.provider.translateStructured(data, targetLanguage, schema);
    }
}
