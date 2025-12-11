
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key present:', !!apiKey);

const genAI = new GoogleGenerativeAI(apiKey || '');


async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m: any) => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods})`);
                }
            });
        } else {
            console.log('No models found or error:', data);
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

listModels();
