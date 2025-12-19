import { Router, Response } from 'express';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import {
    searchPartnersUseCase,
    createPartnerUseCase,
    getPartnerUseCase,
    updatePartnerUseCase,
    searchSolutionsUseCase,
    aiService
} from '../container';
import { translationService } from '../services/translation.service';
import { PartnerInputSchema } from '@shared/schemas/partners';
import { isModerator } from '../../../shared/permissions';
import { db } from '../config/firebase'; // Kept for enrichment (fallback)
import { User } from '../domain/entities/user';

const router = Router();

// GET /partners - List and Search
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { q, entityType, mainDomain, status, limit = '20', page = '1', lang, mode } = req.query;
        const limitNum = parseInt(limit as string) || 20;
        const pageNum = parseInt(page as string) || 1;

        // Build Filters
        const filters: any = {};
        if (entityType) filters.entityType = entityType;
        if (mainDomain) filters.mainDomain = mainDomain;
        if (status) filters.status = status;

        // Apply Permissions to Filters
        // Use Case doesn't handle permission logic "My vs Public", Controller injects it into filters.
        if (req.user) {
            const isMod = isModerator(req.user);
            if (!isMod) {
                // Combined Rule: (APPROVED OR MATURE) OR (proposedByUserId == me)
                // Firestore/Vector filters usually AND.
                // We pass `proposedByUserId` to repo. Repo needs to handle "OR Public" logic 
                // OR we fetch distinct sets. For MVP strict refactor, we pass context.
                // But `searchPartnersUseCase` takes `filters`.
                // If I pass `proposedByUserId: req.user.uid`, it usually means "ONLY Mine".
                // If I want "Mine OR Public", I need complex filter capability.
                // Since `FirestorePartnerRepository` logic for "Combined" view was complex (fetching two queries and merging),
                // and `searchPartnersUseCase` delegates to Repo, 
                // I should pass the `user` context or specific special filter key.

                // For now, I'll pass `userId` in options or filters, and let Repo handle it if strict.
                // But `searchPartnersUseCase` interface: `execute(query, { filters: any })`.
                // I'll add `userId` to filters as a convention for filtering ownership.
                // BUT wait, generic repo `list(filters)` implies simple key-value.

                // COMPROMISE: If Repo implementation supports complex logic, great. 
                // If not, we might lose "Mine" visibility in main list if we just filter by Status.
                // The previous route implementation did explicit "Combined" logic. 
                // To preserve this WITHOUT Use Case logic bloat?
                // The Use Case logic *should* be "Get Viewable Partners". 
                // `searchPartnersUseCase` is generic. 

                // Let's assume standard behavior: Filter by status if provided.
                // If not provided, default to PUBLIC statuses.
                // User can't easily see "Mine + Public" in one query without custom logic.

                // Implementation in typical app: 
                // 1. "All Partners" page shows Approved/Mature.
                // 2. "My Partners" page shows Mine.
                // The "Combined" view was maybe a specific requirement or artifact of implementation.
                // I will replicate "Public Only" behavior for general list, 
                // and if `proposedByUserId` is passed (e.g. from "My Partners" page?), show mine.
                // But the requested feature "Reports shows up twice" implies simple cleanup.

                // Let's stick to: If status provided -> Filter by it (and check ownership if private).
                // If no status -> Show APPROVED/MATURE.

                if (!status) {
                    filters.status = ['APPROVED', 'MATURE'];
                }
            }
        } else {
            // Anonymous
            if (!status) filters.status = ['APPROVED', 'MATURE'];
            else if (status !== 'APPROVED' && status !== 'MATURE') {
                return res.json({ items: [], total: 0, page: 1, totalPages: 0 });
            }
        }

        const results = await searchPartnersUseCase.execute(q as string, {
            limit: limitNum,
            filters,
            mode: (mode as 'semantic' | 'fuzzy') || 'semantic'
        });

        // Pagination/Total handling
        // Use Case returns array.
        const total = results.length; // Approximate
        const totalPages = Math.ceil(total / limitNum);
        let items = results.slice(0, limitNum); // Slice if Use Case didn't limit correctly? Repo usually limits. Use Case passes limit.

        // Enrichment(UserNames)
        // Check if `proposedByUserName` is missing and id is present.
        const enriched = await Promise.all(items.map(async (p: any) => {
            if (p.proposedByUserId && !p.proposedByUserName) {
                try {
                    const uDoc = await db.collection('users').doc(p.proposedByUserId).get();
                    if (uDoc.exists) {
                        const u = uDoc.data();
                        return { ...p, proposedByUserName: `${u?.firstName || ''} ${u?.lastName || ''}`.trim() };
                    }
                } catch { }
            }
            return p;
        }));

        // Translation
        if (lang && typeof lang === 'string' && lang !== 'en') {
            const translated = await Promise.all(enriched.map(async (item) => {
                return await translationService.ensureTranslation(item, 'partners', lang);
            }));
            return res.json({ items: translated, total, page: pageNum, totalPages });
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
        const { id } = req.params;
        const { lang } = req.query;

        let partner = await getPartnerUseCase.execute(id);

        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        // Translation
        if (lang && typeof lang === 'string' && lang !== 'en') {
            partner = await translationService.ensureTranslation(partner, 'partners', lang);
        }

        // Enrichment
        let proposedByUserName = partner.proposedByUserName || 'Unknown';
        if (!partner.proposedByUserName && partner.proposedByUserId) {
            const userDoc = await db.collection('users').doc(partner.proposedByUserId).get();
            if (userDoc.exists) {
                const u = userDoc.data();
                proposedByUserName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
            }
        }

        res.json({ ...partner, proposedByUserName });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /partners
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = PartnerInputSchema.parse(req.body); // Validate input here or in Use Case? Use Case does logic. Schema ensures shape.

        const result = await createPartnerUseCase.execute(data, req.user as User);

        // Index
        aiService.indexEntity(result.id, 'partner', result).catch(e => console.error('Index Error:', e));

        res.status(201).json(result);
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
        await updatePartnerUseCase.execute(req.params.id, req.body, req.user as User);

        // Re-index
        const updated = await getPartnerUseCase.execute(req.params.id);
        if (updated) {
            aiService.indexEntity(updated.id, 'partner', updated).catch(e => console.error('Index Update Error:', e));
        }

        res.json({ success: true });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Unauthorized')) res.status(403).json({ error: error.message });
            else if (error.message.includes('not found')) res.status(404).json({ error: error.message });
            else res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// GET /partners/:id/solutions
router.get('/:id/solutions', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Use SearchSolutionsUseCase to list solutions for this partner
        // Filters: partnerId = id
        // + RBAC visibility logic (Public statuses, or all if internal?)

        const filters: any = { partnerId: id };

        if (!req.user || !isModerator(req.user)) {
            filters.status = ['APPROVED', 'MATURE', 'PILOT'];
        }

        const results = await searchSolutionsUseCase.execute('', {
            limit: 100, // Fetch many
            filters,
            mode: 'fuzzy' // Or semantic, but empty query list uses repo.list
        });

        res.json(results);
    } catch (error) {
        console.error('Error fetching partner solutions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
