import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import {
    getUserUseCase,
    updateUserUseCase,
    listUsersUseCase,
    manageBookmarksUseCase,
    manageAssociationsUseCase,
    syncUserUseCase
} from '../container';
import { UserInputSchema } from '@shared/schemas/users';
import { User } from '../domain/entities/user';
import { db } from '../config/firebase'; // Keep for enrichment if Use Case doesn't fetch nested strictly

const router = Router();

// GET /users/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Sync or Get
        // If profile doesn't exist, we might want to sync.
        // SyncUserUseCase handles create-if-not-exist logic efficiently.
        // Ideally Middleware did validation, but Sync ensures DB record exists.
        // Let's usage `syncUserUseCase` to ensure latest record is returned/created.
        // Passes implicit req.user info (from Auth Middleware decoding).

        // Construct partial User from Auth Token claims if available?
        // req.user has: uid, email, role, etc.
        const user = await syncUserUseCase.execute(uid, req.user?.email, {
            firstName: req.user?.firstName || '', // Usually standard claims don't have names unless custom. 
            // If auth middleware populates standard fields from Firebase Auth token, usage them.
            // Otherwise, just sync basics.
        });

        res.json(user);
    } catch (error) {
        console.error('Error fetching/syncing user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /users/me
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ error: 'Unauthorized' });

        const data = UserInputSchema.partial().parse(req.body);
        await updateUserUseCase.execute(uid, data, req.user as unknown as User);
        res.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else if (error instanceof Error && error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
        } else {
            console.error('Error updating me:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// GET /users/:id - Get specific user
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (req.user?.role !== 'ADMIN' && req.user?.uid !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const user = await getUserUseCase.execute(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /users/:id - Update user (Admin or Self)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await updateUserUseCase.execute(id, req.body, req.user as unknown as User);
        res.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
        } else {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// GET /users/me/bookmarks
// Logic moved to Use Case? No, `ManageBookmarks` is for mutations.
// List bookmarks is query.
// We can use `getUserUseCase` to get bookmarks array, then enrich.
// Or create `GetBookmarksUseCase`. For now, inline enrichment logic is acceptable for Query,
// or generic `GetUser` returns full object including bookmarks array.
router.get('/me/bookmarks', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ error: 'Unauthorized' });

        const user = await getUserUseCase.execute(uid);
        const bookmarks = user?.bookmarks || [];

        // Sorting / Slicing
        const { limit = '20', offset = '0' } = req.query;
        const limitNum = parseInt(limit as string) || 20;
        const offsetNum = parseInt(offset as string) || 0;

        bookmarks.sort((a: any, b: any) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime());
        const sliced = bookmarks.slice(offsetNum, offsetNum + limitNum);

        // Enrichment (Infra dependency here is DB access... ideally Use Case handles this)
        // But for MVP Refactor, keeping enrichment here is safer than building complex Use Case for enrichment right now.
        // Valid CLEAN way: `GetEnrichedBookmarksUseCase`.
        // Let's do inline for expedience given task constraints, verifying functionality.
        const enriched = await Promise.all(sliced.map(async (b: any) => {
            try {
                if (b.solutionId) {
                    const solDoc = await db.collection('solutions').doc(b.solutionId).get();
                    if (solDoc.exists) return { ...b, solutionName: solDoc.data()?.name || 'Unknown' };
                }
            } catch (e) { }
            return { ...b, solutionName: 'Unknown' };
        }));

        res.json({
            items: enriched,
            total: bookmarks.length,
            limit: limitNum,
            offset: offsetNum
        });
    } catch (error) {
        console.error('Error getting bookmarks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /users/me/bookmarks
router.post('/me/bookmarks', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        const { solutionId } = req.body;
        if (!uid || !solutionId) return res.status(400).json({ error: 'Missing solutionId' });

        await manageBookmarksUseCase.addBookmark(uid, solutionId);
        res.status(201).json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// DELETE /users/me/bookmarks/:solutionId
router.delete('/me/bookmarks/:solutionId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        const { solutionId } = req.params;
        if (!uid) return res.status(401).json({ error: 'Unauthorized' });

        await manageBookmarksUseCase.removeBookmark(uid, solutionId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /users - List (Admin)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

        const { role, q, limit = '20', page = '1' } = req.query;
        const limitNum = parseInt(limit as string) || 20;
        const pageNum = parseInt(page as string) || 1;
        const offset = (pageNum - 1) * limitNum;

        const result = await listUsersUseCase.execute({
            limit: limitNum,
            offset,
            filters: { role: role as string },
            search: q as string
        });

        res.json({ items: result.items, total: result.total, page: pageNum, totalPages: Math.ceil(result.total / limitNum) });
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /users/:id/associations
router.post('/:id/associations', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { partnerId } = req.body;
        if (!partnerId) return res.status(400).json({ error: 'Missing partnerId' });

        await manageAssociationsUseCase.requestAssociation(id, partnerId, req.user as unknown as User);
        res.status(201).json({ success: true });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Unauthorized')) return res.status(403).json({ error: error.message });
            if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
            if (error.message.includes('already exists')) return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /users/:id/associations/:partnerId
router.put('/:id/associations/:partnerId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id, partnerId } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        await manageAssociationsUseCase.updateAssociationStatus(id, partnerId, status, req.user as unknown as User);
        res.json({ success: true });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Unauthorized')) return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
