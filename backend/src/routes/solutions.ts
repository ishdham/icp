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

            // Apply status filter if provided, otherwise it depends on user role which statuses are implicit
            if (status) query = query.where('status', '==', status);

            if (limit) query = query.limit(limitNum);

            const snap = await query.get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        };

        let results: any[] = [];
        const isMod = isModerator(req.user);

        // CASE 1: Moderator -> See everything (or filtered by status if provided)
        if (isMod) {
            let query: FirebaseFirestore.Query = db.collection('solutions');
            // If explicit status requested, applied in runQuery. 
            // If no status requested, they see all statuses.
            results = await runQuery(query);
        }
        // CASE 2: Regular User -> See MATURE OR Own
        else if (req.user) {
            // Sub-query A: Mature Solutions
            let matureQuery = db.collection('solutions').where('status', '==', 'MATURE');
            // If user explicitly asked for a status that is NOT Mature, valid?
            // If they ask for "DRAFT", they should only see their own DRAFT.
            // If they ask for "MATURE", they see all MATURE.
            // The logic: "Mature OR Own".

            // If specific status requested:
            if (status) {
                if (status === 'MATURE') {
                    results = await runQuery(matureQuery);
                } else {
                    // Asking for non-mature, can only be own
                    let ownQuery = db.collection('solutions')
                        .where('providerId', '==', req.user.uid)
                        .where('status', '==', status); // Redundant if runQuery adds it, but clearer here
                    results = await runQuery(ownQuery);
                }
            } else {
                // No status specified: Combined View
                const [matureDocs, ownDocs] = await Promise.all([
                    runQuery(matureQuery),
                    runQuery(db.collection('solutions').where('providerId', '==', req.user.uid))
                ]);

                // Merge by ID to avoid duplicates (if I create a Mature solution)
                const map = new Map();
                matureDocs.forEach((d: any) => map.set(d.id, d));
                ownDocs.forEach((d: any) => map.set(d.id, d));
                results = Array.from(map.values());
            }
        }
        // CASE 3: Anonymous -> See MATURE only
        else {
            // If they ask for non-MATURE status, they get nothing
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

        // Apply strict limit after merge/filter? 
        // Requirements didn't specify strict pagination behavior on merge, but good UX:
        if (filteredSolutions.length > limitNum) {
            filteredSolutions = filteredSolutions.slice(0, limitNum);
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

        // All created solutions start as PROPOSED
        const initialStatus = 'PROPOSED';

        // Prevent unauthorized setting of partnerId
        let partnerId = data.partnerId;
        const canApprove = canApproveSolution(req.user);
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

        // Auto-create approval ticket
        // Since initialStatus is always PROPOSED, we always create a ticket
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
