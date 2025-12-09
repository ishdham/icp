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
        }

        // Basic pagination
        if (limit) {
            query = query.limit(parseInt(limit as string));
        }

        const snapshot = await query.get();
        const solutions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Simple in-memory filter for 'q'
        let filteredSolutions = solutions;
        if (q) {
            const search = (q as string).toLowerCase();
            filteredSolutions = solutions.filter((s: any) =>
                s.name?.toLowerCase().includes(search) ||
                s.description?.toLowerCase().includes(search)
            );
        }

        // Aggregate Provider Names
        const solutionWithProviders = await Promise.all(filteredSolutions.map(async (s: any) => {
            if (s.providerId) {
                try {
                    const userDoc = await db.collection('users').doc(s.providerId).get();
                    if (userDoc.exists) {
                        const u = userDoc.data();
                        return { ...s, providerName: `${u?.firstName || ''} ${u?.lastName || ''}`.trim() };
                    }
                } catch (e) {
                    console.error(`Failed to fetch provider for solution ${s.id}`, e);
                }
            }
            return { ...s, providerName: 'Unknown' };
        }));

        res.json({ items: solutionWithProviders });
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
        const canApprove = canApproveSolution(req.user);
        if (!canApprove) {
            if (initialStatus === 'APPROVED' || initialStatus === 'MATURE' || initialStatus === 'PILOT') {
                initialStatus = 'PENDING'; // Force to PENDING if they try to set it to public
            }
        }

        // Prevent unauthorized setting of partnerId
        let partnerId = data.partnerId;
        if (partnerId) {
            // If user is not admin/support, they can only set partnerId if they are associated
            if (!canApprove) {
                const isAssociated = req.user?.associatedPartners?.some((p: any) => p.partnerId === partnerId && p.status === 'APPROVED');
                if (!isAssociated) {
                    // If not associated, they CANNOT set partnerId? 
                    // Or maybe they can, but it needs approval?
                    // For now, let's allow it if they are creating it, maybe they are proposing it for a partner.
                    // But strictly speaking, they should only link to partners they belong to.
                    // Let's enforce association.
                    return res.status(403).json({ error: 'You are not associated with this partner' });
                }
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

        // Enrich response with providerName (cached from current user)
        const providerName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Unknown';

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

        res.status(201).json({ id: docRef.id, ...newSolution.data(), providerName });
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

        const data = doc.data() as any;
        let providerName = 'Unknown';
        if (data.providerId) {
            const userDoc = await db.collection('users').doc(data.providerId).get();
            if (userDoc.exists) {
                const u = userDoc.data();
                providerName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
            }
        }

        let partnerName = undefined;
        if (data.partnerId) {
            const partnerDoc = await db.collection('partners').doc(data.partnerId).get();
            if (partnerDoc.exists) {
                partnerName = partnerDoc.data()?.organizationName;
            }
        }

        res.json({ id: doc.id, ...data, providerName, partnerName });
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

        // Prevent changing partnerId if not authorized (Admin or Associated)
        if (data.partnerId && data.partnerId !== existingSolution.partnerId) {
            if (!canApproveSolution(req.user)) {
                const isAssociated = req.user?.associatedPartners?.some((p: any) => p.partnerId === data.partnerId && p.status === 'APPROVED');
                if (!isAssociated) {
                    return res.status(403).json({ error: 'You are not associated with this partner' });
                }
            }
        }

        await docRef.update(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
