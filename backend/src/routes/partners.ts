import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

import { PartnerSchema } from '../schemas/partners';
import { isModerator, canApprovePartner, canEditPartner } from '../../../shared/permissions';
import { paginate } from '../utils/pagination';

// GET /partners - List and Search Partners
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { status, q, limit = '20', pageToken } = req.query;
        const limitNum = parseInt(limit as string) || 20;
        const token = pageToken as string | undefined;

        // Base Query Helper
        const buildQuery = (collection: FirebaseFirestore.Query) => {
            return collection;
        };

        let results: any[] = [];
        let nextPageToken: string | null = null;
        let total: number = 0;

        const isMod = req.user && (req.user.role === 'ADMIN' || req.user.role === 'ICP_SUPPORT');

        // Pagination wrapper
        const runPaged = async (query: FirebaseFirestore.Query) => {
            return paginate(query, limitNum, token, 'partners');
        };

        // CASE 1: Mod
        if (isMod) {
            let query = buildQuery(db.collection('partners'));
            if (status) query = query.where('status', '==', status);

            const paged = await runPaged(query);
            results = paged.items;
            nextPageToken = paged.nextPageToken;
            total = paged.total;
        }
        // CASE 2: Regular
        else if (req.user) {
            const partnersRef = db.collection('partners');
            if (status) {
                if (status === 'MATURE') {
                    let query = buildQuery(partnersRef).where('status', '==', 'MATURE');
                    const paged = await runPaged(query);
                    results = paged.items;
                    nextPageToken = paged.nextPageToken;
                    total = paged.total;
                } else {
                    // Specific non-mature status, only own
                    let query = buildQuery(partnersRef)
                        .where('proposedByUserId', '==', req.user.uid)
                        .where('status', '==', status);
                    const paged = await runPaged(query);
                    results = paged.items;
                    nextPageToken = paged.nextPageToken;
                    total = paged.total;
                }
            } else {
                // Combined
                const matureQuery = buildQuery(partnersRef).where('status', '==', 'MATURE');
                const ownQuery = buildQuery(partnersRef).where('proposedByUserId', '==', req.user.uid);

                const [maturePaged, ownPaged] = await Promise.all([
                    runPaged(matureQuery),
                    runPaged(ownQuery)
                ]);

                // Merge and Sort
                const map = new Map();
                maturePaged.items.forEach((d: any) => map.set(d.id, d));
                ownPaged.items.forEach((d: any) => map.set(d.id, d));

                let combined = Array.from(map.values());
                combined.sort((a, b) => a.id.localeCompare(b.id));

                if (combined.length > limitNum) {
                    combined = combined.slice(0, limitNum);
                }
                results = combined;
                total = maturePaged.total + ownPaged.total; // Approx total

                if (results.length > 0) {
                    nextPageToken = results[results.length - 1].id;
                } else {
                    nextPageToken = null;
                }

                if (!maturePaged.nextPageToken && !ownPaged.nextPageToken) {
                    if (combined.length <= limitNum && map.size <= limitNum) nextPageToken = null;
                }
            }
        }
        // CASE 3: Anonymous
        else {
            if (status && status !== 'MATURE') {
                results = [];
                nextPageToken = null;
                total = 0;
            } else {
                let query = buildQuery(db.collection('partners')).where('status', '==', 'MATURE');
                const paged = await runPaged(query);
                results = paged.items;
                nextPageToken = paged.nextPageToken;
                total = paged.total;
            }
        }

        // In-memory search (Applied AFTER pagination)
        let filteredPartners = results;
        if (q) {
            const search = (q as string).toLowerCase();
            filteredPartners = results.filter((p: any) =>
                p.organizationName?.toLowerCase().includes(search) ||
                p.entityType?.toLowerCase().includes(search)
            );
        }

        // Aggregate Proposer Names
        const partnersWithNames = await Promise.all(filteredPartners.map(async (p: any) => {
            if (p.proposedByUserId) {
                try {
                    const userDoc = await db.collection('users').doc(p.proposedByUserId).get();
                    if (userDoc.exists) {
                        const u = userDoc.data();
                        return { ...p, proposedByUserName: `${u?.firstName || ''} ${u?.lastName || ''}`.trim() };
                    }
                } catch (e) {
                    console.error(`Failed to fetch proposer for partner ${p.id}`, e);
                }
            }
            return { ...p, proposedByUserName: 'Unknown' };
        }));

        res.json({ items: partnersWithNames, nextPageToken, total });
    } catch (error) {
        console.error('Error fetching partners:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /partners/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const doc = await db.collection('partners').doc(req.params.id).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Partner not found' });
            return;
        }

        const data = doc.data() as any;
        let proposedByUserName = 'Unknown';
        if (data.proposedByUserId) {
            const userDoc = await db.collection('users').doc(data.proposedByUserId).get();
            if (userDoc.exists) {
                const u = userDoc.data();
                proposedByUserName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
            }
        }

        res.json({ id: doc.id, ...data, proposedByUserName });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /partners - Propose Partner
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = PartnerSchema.parse(req.body);

        // All created partners start as PROPOSED
        const initialStatus = 'PROPOSED';

        const proposedByUserName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Unknown';

        const partnerData = {
            ...data,
            status: initialStatus,
            proposedByUserId: req.user?.uid,
            proposedByUserName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('partners').add(partnerData);
        const newPartner = await docRef.get();

        // Auto-create approval ticket if proposed
        if (initialStatus === 'PROPOSED') {
            await db.collection('tickets').add({
                title: `Partner Approval: ${data.organizationName}`,
                description: `Approval request for partner: ${data.organizationName}`,
                type: 'PARTNER_APPROVAL',
                status: 'NEW',
                partnerId: docRef.id,
                createdByUserId: req.user?.uid,
                createdAt: new Date().toISOString(),
                comments: [],
                ticketId: `TKT-${Date.now()}`
            });
        }

        res.status(201).json({ id: docRef.id, ...newPartner.data() });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error('Error creating partner:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// PUT /partners/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const docRef = db.collection('partners').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        const existingPartner = { id: doc.id, ...doc.data() } as any;

        if (!canEditPartner(req.user, existingPartner)) {
            return res.status(403).json({ error: 'Unauthorized to edit this partner' });
        }

        const data = req.body;

        // RBAC: Only Support/Admin can change status
        if (data.status && data.status !== (existingPartner as any).status) {
            if (!canApprovePartner(req.user)) {
                return res.status(403).json({ error: 'Unauthorized to change status' });
            }
        }

        data.updatedAt = new Date().toISOString();

        await docRef.update(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /partners/:id/solutions - List Solutions for a Partner
router.get('/:id/solutions', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const snapshot = await db.collection('solutions')
            .where('partnerId', '==', id)
            .get(); // Should we filter by status? Yes, normal rules apply. 

        const solutions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Reuse the logic from solutions GET /? 
        // Or just return raw list. Let's return raw list but filter public statuses if not logged in / admin?
        // Actually, let's keep it simple. If it's public API, filter. 
        // But if I am the content provider, I want to see my drafts.
        // Let's filter in memory for now based on viewer.

        const canSeeAll = canEditPartner(req.user, { id }); // Heuristic: if I can edit this partner, I can see its drafts?
        // Or more strictly:
        // isModerator || (user.associatedPartners contains this partner)

        // Let's filter statuses that are PUBLIC (APPROVED, MATURE, PILOT) unless viewer has rights.
        let visibleSolutions = solutions;
        if (!req.user || (!isModerator(req.user) && !req.user.associatedPartners?.some((p: any) => p.partnerId === id && p.status === 'APPROVED'))) {
            visibleSolutions = solutions.filter((s: any) => ['APPROVED', 'MATURE', 'PILOT'].includes(s.status));
        }

        res.json(visibleSolutions);
    } catch (error) {
        console.error('Error fetching partner solutions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
