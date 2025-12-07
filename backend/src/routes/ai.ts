import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateContent } from '../services/ai';
import { z } from 'zod';

const router = Router();

const ChatSchema = z.object({
    message: z.string(),
});

// POST /ai/chat
router.post('/chat', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { message } = ChatSchema.parse(req.body);

        // TODO: Add context from vector DB or other tools here
        const prompt = `You are an AI assistant for the Impact Collaboration Platform (ICP). 
    User: ${message}
    AI:`;

        const response = await generateContent(prompt);
        res.json({ response });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

export default router;
