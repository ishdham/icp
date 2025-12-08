import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

import { SolutionSchema } from '../schemas/solutions';
import { isModerator, canApproveSolution, canEditSolution } from '../../../shared/permissions';

// GET /solutions - Search and Filter
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { q, domain, status, limit = '20', pageToken } = req.query;

        let query: FirebaseFirestore.Query = db.collection('solutions');

        if (domain) {
            query = query.where('domain', '==', domain);
        }

        if (status) {
            query = query.where('status', '==', status);
        } else {
            // Default to public statuses if not specified, or show all?
            // For now, let's just show APPROVED/MATURE/PILOT if not specified, or maybe all for simplicity
            // query = query.where('status', 'in', ['APPROVED', 'MATURE', 'PILOT']);
        }

        // Basic pagination
        if (limit) {
            query = query.limit(parseInt(limit as string));
        }

        // Note: 'q' (keyword search) is hard in standard Firestore. 
        // We'll implement basic filtering here, but for real semantic search we'd need Vector Search.
        // For this MVP, we'll skip 'q' filtering on DB side or do client-side filtering if dataset is small.

        const snapshot = await query.get();
        const solutions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Simple in-memory filter for 'q' if provided (inefficient for large datasets)
        let filteredSolutions = solutions;
        if (q) {
            const search = (q as string).toLowerCase();
            filteredSolutions = solutions.filter((s: any) =>
                s.name?.toLowerCase().includes(search) ||
                s.description?.toLowerCase().includes(search)
            );
        }

        res.json({ items: filteredSolutions });
    } catch (error) {
        console.error('Error fetching solutions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /solutions - Create Solution
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = SolutionSchema.parse(req.body);

        // RBAC: Regular users can only create DRAFT or PENDING solutions
        let initialStatus = data.status;
        if (!canApproveSolution(req.user)) {
            if (initialStatus === 'APPROVED' || initialStatus === 'MATURE' || initialStatus === 'PILOT') {
                initialStatus = 'PENDING'; // Force to PENDING if they try to set it to public
            }
        }

        const solutionData = {
            ...data,
            status: initialStatus,
            providerId: req.user?.uid, // Link to creator
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('solutions').add(solutionData);
        const newSolution = await docRef.get();

        // Auto-create approval ticket if not approved
        if (initialStatus !== 'APPROVED' && initialStatus !== 'MATURE' && initialStatus !== 'PILOT') {
            await db.collection('tickets').add({
                title: `Approval Request: ${data.name}`,
                description: `Approval request for solution: ${data.name}`,
                type: 'SOLUTION_APPROVAL',
                status: 'NEW',
                solutionId: docRef.id,
                createdByUserId: req.user?.uid,
                createdAt: new Date().toISOString(),
                comments: [],
                ticketId: `TKT-${Date.now()}`
            });
        }

        res.status(201).json({ id: docRef.id, ...newSolution.data() });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error('Error creating solution:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// GET /solutions/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const doc = await db.collection('solutions').doc(req.params.id).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Solution not found' });
            return;
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /solutions/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const docRef = db.collection('solutions').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Solution not found' });
        }

        const existingSolution = { id: doc.id, ...doc.data() } as any;

        if (!canEditSolution(req.user, existingSolution)) {
            return res.status(403).json({ error: 'Unauthorized to edit this solution' });
        }

        const data = req.body;

        // Prevent status change if not authorized
        if (data.status && data.status !== existingSolution.status) {
            if (!canApproveSolution(req.user)) {
                return res.status(403).json({ error: 'Unauthorized to change status' });
            }
        }

        await docRef.update(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
