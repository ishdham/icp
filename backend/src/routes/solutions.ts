import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

import { SolutionSchema } from '../schemas/solutions';
import { isModerator, canApproveSolution, canEditSolution } from '../../../shared/permissions';

// GET /solutions - Search and Filter
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { q, domain, status, limit = '20', pageToken } = req.query;
        const limitNum = parseInt(limit as string);

        // Helper to run a query
        const runQuery = async (baseQuery: FirebaseFirestore.Query) => {
            let query = baseQuery;
            if (domain) query = query.where('domain', '==', domain);

            // Apply status filter if provided
            if (status) query = query.where('status', '==', status);

            if (limit) query = query.limit(limitNum);

            const snap = await query.get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        };

        let results: any[] = [];
        const isMod = isModerator(req.user);

        // CASE 1: Moderator -> See everything
        if (isMod) {
            let query: FirebaseFirestore.Query = db.collection('solutions');
            results = await runQuery(query);
        }
        // CASE 2: Regular User -> See MATURE OR Own (Proposed/Provided)
        else if (req.user) {
            const matureQuery = db.collection('solutions').where('status', '==', 'MATURE');

            if (status) {
                if (status === 'MATURE') {
                    results = await runQuery(matureQuery);
                } else {
                    // Asking for non-mature, can only be own (created by user)
                    // We check proposedByUserId (the creator)
                    let ownQuery = db.collection('solutions')
                        .where('proposedByUserId', '==', req.user.uid)
                        .where('status', '==', status);
                    results = await runQuery(ownQuery);
                }
            } else {
                // No status specified: Combined View (Mature + Own)
                const [matureDocs, ownDocs] = await Promise.all([
                    runQuery(matureQuery),
                    runQuery(db.collection('solutions').where('proposedByUserId', '==', req.user.uid))
                ]);

                const map = new Map();
                matureDocs.forEach((d: any) => map.set(d.id, d));
                ownDocs.forEach((d: any) => map.set(d.id, d));
                results = Array.from(map.values());
            }
        }
        // CASE 3: Anonymous -> See MATURE only
        else {
            if (status && status !== 'MATURE') {
                results = [];
            } else {
                let matureQuery = db.collection('solutions').where('status', '==', 'MATURE');
                results = await runQuery(matureQuery);
            }
        }

        // Simple in-memory filter for 'q'
        let filteredSolutions = results;
        if (q) {
            const search = (q as string).toLowerCase();
            filteredSolutions = results.filter((s: any) =>
                s.name?.toLowerCase().includes(search) ||
                s.description?.toLowerCase().includes(search)
            );
        }

        // Limit
        if (filteredSolutions.length > limitNum) {
            filteredSolutions = filteredSolutions.slice(0, limitNum);
        }

        // Aggregate Names (Denormalized names should be in DB, but we fetch if missing/legacy)
        const solutionWithNames = await Promise.all(filteredSolutions.map(async (s: any) => {
            let updates: any = {};

            // providedByPartnerName
            if (s.providedByPartnerId && !s.providedByPartnerName) {
                try {
                    const pDoc = await db.collection('partners').doc(s.providedByPartnerId).get();
                    if (pDoc.exists) {
                        updates.providedByPartnerName = pDoc.data()?.organizationName;
                    }
                } catch (e) { console.error(e); }
            }

            // proposedByUserName
            if (s.proposedByUserId && !s.proposedByUserName) {
                try {
                    const uDoc = await db.collection('users').doc(s.proposedByUserId).get();
                    if (uDoc.exists) {
                        const u = uDoc.data();
                        updates.proposedByUserName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
                    }
                } catch (e) { console.error(e); }
            }

            // Fallback for legacy 'providerId' if migration hasn't run yet?
            // (We assume migration will run, but this handles inflight read)

            return { ...s, ...updates };
        }));

        res.json({ items: solutionWithNames });
    } catch (error) {
        console.error('Error fetching solutions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /solutions - Create Solution
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = SolutionSchema.parse(req.body);

        // All created solutions start as PROPOSED
        const initialStatus = 'PROPOSED';

        // Auto-populate user info
        const proposedByUserId = req.user?.uid;
        const proposedByUserName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Unknown';

        // Handle providedByPartnerId
        let providedByPartnerName = undefined;
        if (data.providedByPartnerId) {
            // Validate Partner exists
            const partnerDoc = await db.collection('partners').doc(data.providedByPartnerId).get();
            if (!partnerDoc.exists) {
                return res.status(400).json({ error: 'Invalid providedByPartnerId: Partner not found' });
            }
            providedByPartnerName = partnerDoc.data()?.organizationName;

            // Optional: Check if user is associated with this partner?
            // "The user clarified that providerId is a Partner". 
            // If strict, we should check association. 
            // Reuse canApproveSolution logic or specific association check.
            const canApprove = canApproveSolution(req.user);
            if (!canApprove) {
                const isAssociated = req.user?.associatedPartners?.some((p: any) => p.partnerId === data.providedByPartnerId && p.status === 'APPROVED');
                if (!isAssociated) {
                    return res.status(403).json({ error: 'You are not associated with this partner' });
                }
            }
        }

        const solutionData = {
            ...data,
            status: initialStatus,
            proposedByUserId,
            proposedByUserName,
            providedByPartnerName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('solutions').add(solutionData);
        const newSolution = await docRef.get();

        // Auto-create approval ticket
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

        const data = doc.data() as any;
        res.json({ id: doc.id, ...data });
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

        // Handle providedByPartnerId change
        if (data.providedByPartnerId && data.providedByPartnerId !== existingSolution.providedByPartnerId) {
            const partnerDoc = await db.collection('partners').doc(data.providedByPartnerId).get();
            if (!partnerDoc.exists) {
                return res.status(400).json({ error: 'Invalid providedByPartnerId: Partner not found' });
            }
            data.providedByPartnerName = partnerDoc.data()?.organizationName;

            // Check permissions for new partner
            if (!canApproveSolution(req.user)) {
                const isAssociated = req.user?.associatedPartners?.some((p: any) => p.partnerId === data.providedByPartnerId && p.status === 'APPROVED');
                if (!isAssociated) {
                    return res.status(403).json({ error: 'You are not associated with this partner' });
                }
            }
        }

        // Prevent status change if not authorized
        if (data.status && data.status !== existingSolution.status) {
            if (!canApproveSolution(req.user)) {
                return res.status(403).json({ error: 'Unauthorized to change status' });
            }
        }

        // Always update updatedAt
        data.updatedAt = new Date().toISOString();

        await docRef.update(data);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
