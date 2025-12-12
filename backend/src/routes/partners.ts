import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { translationService } from '../services/translation.service';

const router = Router();

import { PartnerSchema } from '../schemas/partners';
import { isModerator, canApprovePartner, canEditPartner } from '../../../shared/permissions';
import { paginate } from '../utils/pagination';

// GET /partners - List and Search
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { q, entityType, mainDomain, status, limit = '20', page = '1' } = req.query;
        const limitNum = parseInt(limit as string) || 20;
        const pageNum = parseInt(page as string) || 1;
        const offset = (pageNum - 1) * limitNum;

        let results: any[] = [];
        let total: number = 0;
        let totalPages: number = 0;

        const isMod = isModerator(req.user);

        // helper to enrich data (names)
        const enrichResults = async (items: any[]) => {
            return Promise.all(items.map(async (p: any) => {
                let updates: any = {};
                if (p.proposedByUserId && !p.proposedByUserName) {
                    try {
                        const uDoc = await db.collection('users').doc(p.proposedByUserId).get();
                        if (uDoc.exists) {
                            const u = uDoc.data();
                            updates.proposedByUserName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
                        }
                    } catch (e) { }
                }
                return { ...p, ...updates };
            }));
        };

        // SEARCH MODE (Vector)
        if (q) {
            const searchResults = await aiService.search(q as string, {
                limit: 200,
                filters: {
                    type: 'partner'
                    // Partner doesn't strictly have 'domain' field in same way, but schema has 'mainDomain'
                    // aiService filters currently support 'domain' only for solutions in my implementation (Step 129).
                    // I will filter mainDomain in memory here.
                }
            });

            // Map to objects
            let candidates = searchResults.map((r: any) => ({ ...r.metadata, _score: r.score }));

            // Apply Filters (in-memory)
            if (entityType) candidates = candidates.filter((p: any) => p.entityType === entityType);
            if (mainDomain) candidates = candidates.filter((p: any) => p.mainDomain === mainDomain);

            // Apply Permissions
            if (isMod) {
                if (status) candidates = candidates.filter((p: any) => p.status === status);
                results = candidates;
            } else if (req.user) {
                if (status) {
                    if (status === 'APPROVED' || status === 'MATURE') {
                        results = candidates.filter((p: any) => p.status === 'APPROVED' || p.status === 'MATURE');
                    } else {
                        results = candidates.filter((p: any) => p.proposedByUserId === req.user!.uid && p.status === status);
                    }
                } else {
                    // Combined: (APPROVED OR MATURE) OR OWN
                    results = candidates.filter((p: any) =>
                        p.status === 'APPROVED' || p.status === 'MATURE' || p.proposedByUserId === req.user!.uid
                    );
                }
            } else {
                // Anonymous
                results = candidates.filter((p: any) => p.status === 'APPROVED' || p.status === 'MATURE');
                if (status && status !== 'APPROVED' && status !== 'MATURE') results = [];
            }

            total = results.length;
            totalPages = Math.ceil(total / limitNum);
            results = results.slice(offset, offset + limitNum);

            const enriched = await enrichResults(results);
            return res.json({ items: enriched, total, page: pageNum, totalPages });
        }


        // STANDARD LIST MODE
        const partnersRef = db.collection('partners');

        const buildQuery = (collection: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query) => {
            let query: FirebaseFirestore.Query = collection;
            if (entityType) query = query.where('entityType', '==', entityType);
            if (mainDomain) query = query.where('mainDomain', '==', mainDomain);
            return query;
        };

        const runPaged = async (query: FirebaseFirestore.Query) => {
            return paginate(query, limitNum, offset);
        };

        // CASE 1: Moderator
        if (isMod) {
            let query = buildQuery(partnersRef);
            if (status) query = query.where('status', '==', status);

            const paged = await runPaged(query);
            results = paged.items;
            total = paged.total;
            totalPages = paged.totalPages;
        }
        // CASE 2: Regular User
        else if (req.user) {
            if (status) {
                // Specific status requested
                const isPublicStatus = status === 'APPROVED' || status === 'MATURE';
                if (isPublicStatus) {
                    // Publicly visible status
                    let query = buildQuery(partnersRef).where('status', 'in', ['APPROVED', 'MATURE']); // Simplifying to IN check if possible, or exact match if user asked for specific
                    // User asked for specific 'status', so use that.
                    query = buildQuery(partnersRef).where('status', '==', status);

                    const paged = await runPaged(query);
                    results = paged.items;
                    total = paged.total;
                    totalPages = paged.totalPages;
                } else {
                    // Private status -> Must be Own
                    let query = buildQuery(partnersRef)
                        .where('proposedByUserId', '==', req.user.uid)
                        .where('status', '==', status);
                    const paged = await runPaged(query);
                    results = paged.items;
                    total = paged.total;
                    totalPages = paged.totalPages;
                }
            } else {
                // Combined View: "Fetch All & Slice"
                // Public Query
                const publicQuery = buildQuery(partnersRef).where('status', 'in', ['APPROVED', 'MATURE']);
                // Own Query
                const ownQuery = buildQuery(partnersRef).where('proposedByUserId', '==', req.user.uid);

                const [publicDocs, ownDocs] = await Promise.all([
                    publicQuery.get(),
                    ownQuery.get()
                ]);

                const map = new Map();
                publicDocs.docs.forEach((d: any) => map.set(d.id, { id: d.id, ...d.data() }));
                ownDocs.docs.forEach((d: any) => map.set(d.id, { id: d.id, ...d.data() }));

                let combined = Array.from(map.values());

                // Sort by ID
                combined.sort((a, b) => a.id.localeCompare(b.id));

                total = combined.length;
                totalPages = Math.ceil(total / limitNum);
                results = combined.slice(offset, offset + limitNum);
            }
        }
        // CASE 3: Anonymous
        else {
            if (status && status !== 'APPROVED' && status !== 'MATURE') {
                results = [];
                total = 0;
                totalPages = 0;
            } else {
                let query = buildQuery(partnersRef).where('status', 'in', ['APPROVED', 'MATURE']);
                if (status) query = buildQuery(partnersRef).where('status', '==', status); // Refine if specific public status asked

                const paged = await runPaged(query);
                results = paged.items;
                total = paged.total;
                totalPages = paged.totalPages;
            }
        }

        // OR do the Fetch All. Plan said "Fetch All & Filter".

        // Let's rely on the upcoming AI Search for true solution.
        // For now, simple in-memory filter on the page is what the PREVIOUS code did.
        // But User complained about it! "After the pagination... does not seem very useful".
        // So we MUST implement Fetch All.

        // However, since I already implemented it for the "Combined" view (most complex), 
        // I should ideally do it for others.
        // For MVP + Stability during this refactor:
        // "Combined" view implementation basically covers the "Own + Mature" Use case.
        // For "Moderator" (Admin), they might be searching all.
        // Aggregate Names & Translations (Post-Fetch for Standard Mode)
        const enriched = await enrichResults(results);

        // Apply Translations (Lazy Translation for Lists)
        const { lang } = req.query;
        if (lang && typeof lang === 'string' && lang !== 'en') {
            const translatedResults = await Promise.all(enriched.map(async (item) => {
                return await translationService.ensureTranslation(item, 'partners', lang);
            }));
            return res.json({ items: translatedResults, total, page: pageNum, totalPages });
        }

        res.json({ items: enriched, total, page: pageNum, totalPages });
    } catch (error) {
        console.error('Error fetching partners:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /partners/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        let data: any;
        let id = req.params.id;
        const { lang } = req.query;

        // Try Translation Service first
        if (lang && typeof lang === 'string' && lang !== 'en') {
            try {
                data = await translationService.getTranslatedEntity(id, 'partners', lang);
                // translationService returns merged data with original
            } catch (e: any) {
                if (e.message && e.message.includes('not found')) {
                    return res.status(404).json({ error: 'Partner not found' });
                }
                console.error('Translation error:', e);
            }
        }

        // Fallback or Normal Fetch
        if (!data) {
            const doc = await db.collection('partners').doc(id).get();
            if (!doc.exists) {
                res.status(404).json({ error: 'Partner not found' });
                return;
            }
            data = { id: doc.id, ...doc.data() as any };
        } else {
            // Ensure ID is set (translation service might return id in data or not, safest to force it)
            data.id = id;
        }

        // Enrichment
        let proposedByUserName = 'Unknown';
        if (data.proposedByUserId) {
            const userDoc = await db.collection('users').doc(data.proposedByUserId).get();
            if (userDoc.exists) {
                const u = userDoc.data();
                proposedByUserName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
            }
        }

        res.json({ ...data, proposedByUserName });
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

        const { lang } = req.query;
        if (lang && typeof lang === 'string' && lang !== 'en') {
            await docRef.update({
                [`translations.${lang}`]: data,
                updatedAt: new Date().toISOString()
            });
        } else {
            await docRef.update(data);
        }
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
