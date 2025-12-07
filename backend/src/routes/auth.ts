import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { z } from 'zod';

const router = Router();

const RegistrationSchema = z.object({
    uid: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.object({
        countryCode: z.string().default('+91'),
        number: z.string(),
    }),
    discoverySource: z.string().optional(),
    visitPurpose: z.string().optional(),
});

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const data = RegistrationSchema.parse(req.body);

        const userRef = db.collection('users').doc(data.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            // User already exists, maybe update last login time or merge non-destructive fields
            // For now, just return success to allow login to proceed without resetting role/bookmarks
            res.status(200).json({ success: true, message: 'User already exists' });
            return;
        }

        const userData = {
            ...data,
            role: 'REGULAR',
            createdAt: new Date().toISOString(),
            bookmarks: [],
        };

        await userRef.set(userData);
        res.status(201).json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error('Registration Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

export default router;
