import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import {
    listTicketsUseCase,
    createTicketUseCase,
    updateTicketUseCase,
    resolveTicketUseCase,
    getTicketUseCase
} from '../container';
import { TicketInputSchema } from '@shared/schemas/tickets';
import { canSeeTickets, isModerator } from '../../../shared/permissions';
import { db } from '../config/firebase'; // Kept for enrichment if Use Case doesn't handle it fully yet (it handles basic list)
import { User } from '../domain/entities/user';

const router = Router();

const StatusUpdateSchema = z.object({
    status: z.enum(['NEW', 'WIP', 'PENDING', 'RESOLVED', 'REJECTED_NO_RESOLUTION', 'CLOSED']),
    comment: z.string(),
});

// GET /tickets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { status, assignedToMe, limit = '20', offset = '0' } = req.query;
        // const limitNum = parseInt(limit as string) || 20; // Use Case doesn't support pagination object yet, just list?
        // Repo.list supports simple filters.
        // Pagination logic was: `paginate(query...)`.
        // ListTicketsUseCase calls `repo.list(filters)`. Repo returns ALL matching filters?
        // FirestoreRepository.list returns all matching docs.
        // The original route used `paginate` utility which does offset/limit via Firestore Query.
        // My generic `list` method takes `FilterOptions`.
        // To support pagination properly, Use Case should accept pagination options.
        // For MVP refactor, `repo.list` fetches all matching. We can slice in memory or ignore pagination for now?
        // Or update `list` signature?
        // Current `repo.list` implementation fetches ALL.
        // Let's slice in memory for now to match behavior roughly, or accepting fetching all (limit 20 default).

        const filters: any = {};
        if (status) filters.status = status;

        // RBAC / My Tickets
        if (assignedToMe === 'true' && req.user) {
            filters.assignedToUserId = req.user.uid;
        } else if (!canSeeTickets(req.user)) {
            filters.createdByUserId = req.user?.uid;
        }

        const tickets = await listTicketsUseCase.execute({ filters });

        // In-memory pagination/sorting
        // Original was sorting? Firestore default info order?
        // Fetch All, then Slice.
        const limitNum = parseInt(limit as string) || 20;
        const offsetNum = parseInt(offset as string) || 0;
        const total = tickets.length;
        const pagedItems = tickets.slice(offsetNum, offsetNum + limitNum);

        // Enrichment (Creator Name)
        // Original route did this. Use Case returns Ticket.
        const ticketsWithNames = await Promise.all(pagedItems.map(async (t: any) => {
            if (t.createdByUserId && !t.createdByUserName) { // Only fetch if missing
                try {
                    const userDoc = await db.collection('users').doc(t.createdByUserId).get();
                    if (userDoc.exists) {
                        const u = userDoc.data();
                        return { ...t, createdByUserName: `${u?.firstName || ''} ${u?.lastName || ''}`.trim() };
                    }
                } catch (e) { }
            }
            return t;
        }));

        res.json({
            items: ticketsWithNames,
            total,
            page: Math.floor(offsetNum / limitNum) + 1,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /tickets
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = TicketInputSchema.parse(req.body);
        const result = await createTicketUseCase.execute(data, req.user as unknown as User);
        res.status(201).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error('Error creating ticket:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// PATCH /tickets/:id/status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, comment } = StatusUpdateSchema.parse(req.body);

        await resolveTicketUseCase.execute(id, status, comment, req.user as unknown as User);
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

// PUT /tickets/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        await updateTicketUseCase.execute(req.params.id, req.body, req.user as unknown as User);
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

export default router;
