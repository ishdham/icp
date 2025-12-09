import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

import { PartnerSchema } from '../schemas/partners';
import { isModerator, canApprovePartner, canEditPartner } from '../../../shared/permissions';

// GET /partners - List and Search Partners
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { status, q } = req.query;

        // Helper to run query
        const runQuery = async (baseQuery: FirebaseFirestore.Query) => {
            let query = baseQuery;
            if (status) query = query.where('status', '==', status);
            const snap = await query.get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        };

        let results: any[] = [];
        const isMod = isModerator(req.user);

        // CASE 1: Moderator -> All
        if (isMod) {
            results = await runQuery(db.collection('partners'));
        }
        // CASE 2: Regular -> Mature OR Proposed By Me
        else if (req.user) {
            if (status) {
                if (status === 'MATURE') {
                    results = await runQuery(db.collection('partners').where('status', '==', 'MATURE'));
                } else {
                    // Specific non-mature status, only own
                    results = await runQuery(db.collection('partners')
                        .where('proposedByUserId', '==', req.user.uid)
                        .where('status', '==', status));
                }
            } else {
                // Combined
                const [matureDocs, ownDocs] = await Promise.all([
                    runQuery(db.collection('partners').where('status', '==', 'MATURE')),
                    runQuery(db.collection('partners').where('proposedByUserId', '==', req.user.uid))
                ]);
                const map = new Map();
                matureDocs.forEach((d: any) => map.set(d.id, d));
                ownDocs.forEach((d: any) => map.set(d.id, d));
                results = Array.from(map.values());
            }
        }
        // CASE 3: Anonymous -> Mature Only
        else {
            if (status && status !== 'MATURE') {
                results = [];
            } else {
                results = await runQuery(db.collection('partners').where('status', '==', 'MATURE'));
            }
        }

        // In-memory search
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

        res.json(partnersWithNames);
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
