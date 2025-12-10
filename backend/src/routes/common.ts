import { Router, Response, Request } from 'express';
import { db } from '../config/firebase';

const router = Router();

// GET /common/beneficiary-types
router.get('/beneficiary-types', async (req: Request, res: Response) => {
    try {
        const snapshot = await db.collection('beneficiary_types').get();
        const types = snapshot.docs.map(doc => doc.data().name).sort();
        // Also fetch unique from solutions? Ideally we keep them in sync or just rely on this list.
        // For now, let's allow this list to be the source of truth for the dropdown options.
        res.json(types);
    } catch (error) {
        console.error('Error fetching beneficiary types:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /common/beneficiary-types
router.post('/beneficiary-types', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string') {
            res.status(400).json({ error: 'Name is required' });
            return;
        }

        const trimmedName = name.trim();
        // Check if exists
        const snapshot = await db.collection('beneficiary_types').where('name', '==', trimmedName).get();
        if (!snapshot.empty) {
            res.json({ name: trimmedName }); // Already exists, just return it
            return;
        }

        await db.collection('beneficiary_types').add({ name: trimmedName, createdAt: new Date().toISOString() });
        res.status(201).json({ name: trimmedName });
    } catch (error) {
        console.error('Error creating beneficiary type:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
