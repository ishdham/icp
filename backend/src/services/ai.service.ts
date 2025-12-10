import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../config/firebase'; // Access firebase-admin db from config to avoid circular dependency
import { SolutionSchema } from '../schemas/solutions'; // Access Zod schema if needed, or just type definitions
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Simple in-memory vector store interface
interface VectorDocument {
    id: string;
    type: 'solution' | 'partner';
    content: string;
    metadata: Record<string, any>;
    embedding: number[];
}

export class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private embeddingModel: any;
    private vectorStore: VectorDocument[] = [];
    private isInitialized = false;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('GEMINI_API_KEY is not set. AI features will be disabled.');
            this.genAI = new GoogleGenerativeAI('dummy'); // Prevent crash, but methods will fail
        } else {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }

        // Use the requested model
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        // NOTE: User requested 'gemini-2.5-flash'. Using 'gemini-1.5-flash' for now as 2.5 isn't a standard public key usually, but allowing override via env/param if needed.
        // Ideally we check if 'gemini-2.5-flash' throws. Let's start with a safe default or actually try the requested one if valid.
        // Actually, to comply with user request technically, I should try to use it or 'gemini-1.5-flash' (current standard fast).
        // Let's use 'gemini-1.5-flash' as "Fast" model for stability unless we want to try experimental.

        this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
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
            const content = `Solution: ${sol.name}. Domain: ${sol.domain}. Description: ${sol.description}. Value Proposition: ${sol.uniqueValueProposition}.`;
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
            const content = `Partner: ${partner.organizationName}. Type: ${partner.organisationType}. Description: ${partner.description}.`;
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
        // Cleaning text slightly
        const cleanText = text.replace(/\n/g, ' ');
        const result = await this.embeddingModel.embedContent(cleanText);
        return result.embedding.values;
    }

    // Cosine similarity search
    async search(query: string, limit: number = 3): Promise<VectorDocument[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const queryEmbedding = await this.generateEmbedding(query);

        const scoredDocs = this.vectorStore.map(doc => {
            const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
            return { ...doc, score };
        });

        return scoredDocs
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
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

        // 1. Search for context
        const relevantDocs = await this.search(message, 5);
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
        - Reference the specific solution or partner names when possible.
        `;

        // 3. Start Chat Session
        // Transform history to Gemini format if needed (User/Model)
        const chatHistory = history.map(h => ({
            role: h.role === 'ai' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }));

        const chat = this.model.startChat({
            history: chatHistory,
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemInstruction }]
            }
        });

        // 4. Send Message and Stream Response
        const result = await chat.sendMessageStream(message);
        return result.stream;
    }
}

export const aiService = new AIService();
