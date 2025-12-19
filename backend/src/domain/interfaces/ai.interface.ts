import { ZodSchema } from 'zod';

export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    content: string;
}

export interface AiAttachment {
    type: 'image' | 'file';
    content: string; // base64
    mimeType: string;
}

export interface IAIService {
    // Research & Extraction
    generateResponse(prompt: string): Promise<string>;
    researchTopic(topic: string, instructions?: string, attachments?: AiAttachment[]): Promise<string>;
    extractStructuredData<T>(text: string, schema: ZodSchema<T>): Promise<T>;

    // Chat & Embeddings
    generateEmbedding(text: string): Promise<number[]>;
    chatStream(systemPrompt: string, userMessage: string, history: ChatMessage[]): Promise<any>;

    // Translation
    translateText(text: string, targetLanguage: string): Promise<string>;
    translateStructured<T>(data: any, targetLanguage: string, schema?: ZodSchema<T>): Promise<T>;
}
