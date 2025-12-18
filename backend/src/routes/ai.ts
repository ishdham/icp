import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai.service';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const stream = await aiService.chatStream(message, history || []);

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of stream) {
            const chunkText = chunk.text;
            res.write(chunkText);
        }

        res.end();
    } catch (error) {
        console.error('Error in AI chat endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.end();
        }
    }
});


router.post('/research', async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        const result = await aiService.researchSolution(prompt);
        res.json(result);
    } catch (error) {
        console.error('Error researching solution:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
            res.status(429).json({ error: 'AI Usage Limit Exceeded', details: 'The AI service is currently busy or your quota is exceeded. Please try again later.' });
        } else {
            res.status(500).json({ error: 'Failed to research solution', details: errorMessage });
        }
    }
});

router.post('/extract-structured', async (req: Request, res: Response) => {
    try {
        const { researchText } = req.body;
        if (!researchText) {
            res.status(400).json({ error: 'Research text is required' });
            return;
        }
        const result = await aiService.extractStructuredData(researchText);
        res.json(result);
    } catch (error) {
        console.error('Error extracting structured data:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
            res.status(429).json({ error: 'AI Usage Limit Exceeded', details: 'The AI service is currently busy or your quota is exceeded. Please try again later.' });
        } else if (errorMessage.includes('Validation Failed')) {
            // Provide explicit validation details to frontend
            res.status(400).json({ error: 'Extraction Validation Failed', details: errorMessage });
        } else {
            res.status(500).json({ error: 'Failed to extract solution details', details: errorMessage });
        }
    }
});

export default router;
