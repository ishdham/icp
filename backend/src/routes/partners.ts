import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

import { PartnerSchema } from '../schemas/partners';

// GET /partners - List and Search Partners
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { status, q } = req.query;
        let query: FirebaseFirestore.Query = db.collection('partners');

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();
        const partners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // In-memory search
        let filteredPartners = partners;
        if (q) {
            const search = (q as string).toLowerCase();
            filteredPartners = partners.filter((p: any) =>
                p.organizationName?.toLowerCase().includes(search) ||
                p.entityType?.toLowerCase().includes(search)
            );
        }

        res.json(filteredPartners);
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
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /partners - Propose Partner
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = PartnerSchema.parse(req.body);

        // Force status to PROPOSED for non-admins
        let initialStatus = data.status;
        if (req.user?.role !== 'ICP_SUPPORT' && req.user?.role !== 'ADMIN') {
            initialStatus = 'PROPOSED';
        }

        const partnerData = {
            ...data,
            status: initialStatus,
            proposedByUserId: req.user?.uid,
            createdAt: new Date().toISOString(),
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
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// PUT /partners/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = req.body;

        // RBAC: Only Support/Admin can change status
        if (data.status) {
            if (req.user?.role !== 'ICP_SUPPORT' && req.user?.role !== 'ADMIN') {
                return res.status(403).json({ error: 'Unauthorized to change status' });
            }
        }

        // Validate partial update? For now, just update
        await db.collection('partners').doc(req.params.id).update(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
