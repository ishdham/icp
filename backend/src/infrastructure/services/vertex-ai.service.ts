import { IAIService, ChatMessage } from '../../domain/interfaces/ai.interface';
import { genkit } from 'genkit';
import { vertexAI, textEmbedding004 } from '@genkit-ai/vertexai';
import { ZodSchema } from 'zod';

// Initialize Genkit
const ai = genkit({
    plugins: [
        vertexAI({ location: 'us-central1', projectId: 'icp-demo-480309' }),
    ],
});

export class VertexAIService implements IAIService {

    async researchTopic(topic: string): Promise<string> {
        const researchPrompt = `
        You are an expert analyst. Research and synthesize information about: ${topic}.
        Provide a detailed summary, key benefits, and relevant details.
        Concise and professional.
        `;

        const result = await ai.generate({
            model: 'vertexai/gemini-2.5-flash',
            prompt: researchPrompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                googleSearchRetrieval: {}
            }
        });

        return result.text;
    }

    async extractStructuredData<T>(text: string, schema: ZodSchema<T>): Promise<T> {
        const prompt = `
        Extract structured data from the following text matches the schema.
        TEXT: ${text}
        `;

        const result = await ai.generate({
            model: 'vertexai/gemini-2.5-flash',
            prompt: prompt,
            output: {
                schema: schema as any // Genkit types might need casting depending on version
            }
        });

        return result.output as T;
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const cleanText = text.replace(/\n/g, ' ');
        const result = await ai.embed({
            embedder: textEmbedding004,
            content: cleanText
        });
        return result[0].embedding;
    }

    async chatStream(systemPrompt: string, userMessage: string, history: ChatMessage[]): Promise<any> {
        // Map history to Genkit messages format if needed
        // Current Genkit stream API logic from ai.service.ts

        const messages = history.map(h => ({
            role: h.role,
            content: [{ text: h.content }]
        }));

        const { stream } = await ai.generateStream({
            model: 'vertexai/gemini-2.5-flash',
            prompt: userMessage,
            system: systemPrompt,
            messages: messages as any
        });

        return stream;
    }
}
