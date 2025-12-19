import { Router, Response } from 'express';
import admin from 'firebase-admin';
import { db } from '../config/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { aiService } from '../container';

const router = Router();

import { TicketSchema, TicketInputSchema } from '@shared/schemas/tickets';
import { canSeeTickets, canEditTickets } from '../../../shared/permissions';
import { paginate } from '../utils/pagination';

const StatusUpdateSchema = z.object({
    status: z.enum(['NEW', 'WIP', 'PENDING', 'RESOLVED', 'REJECTED_NO_RESOLUTION', 'CLOSED']),
    comment: z.string(),
});

// GET /tickets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { status, assignedToMe, limit = '20', offset = '0' } = req.query;
        const limitNum = parseInt(limit as string) || 20;
        const offsetNum = parseInt(offset as string) || 0;

        let query: admin.firestore.Query = db.collection('tickets');

        if (status) {
            query = query.where('status', '==', status);
        }

        if (assignedToMe === 'true' && req.user) {
            query = query.where('assignedToUserId', '==', req.user.uid);
        } else if (!canSeeTickets(req.user)) {
            // Regular users should only see their own tickets
            query = query.where('createdByUserId', '==', req.user?.uid);
        }

        // Pagination
        const paged = await paginate(query, limitNum, offsetNum, 'tickets');
        const tickets = paged.items;
        const { total, page, totalPages } = paged;

        // Aggregate Creator Names
        const ticketsWithNames = await Promise.all(tickets.map(async (t: any) => {
            if (t.createdByUserId) {
                try {
                    const userDoc = await db.collection('users').doc(t.createdByUserId).get();
                    if (userDoc.exists) {
                        const u = userDoc.data();
                        return { ...t, createdByUserName: `${u?.firstName || ''} ${u?.lastName || ''}`.trim() };
                    }
                } catch (e) {
                    console.error(`Failed to fetch creator for ticket ${t.id}`, e);
                }
            }
            return { ...t, createdByUserName: 'Unknown' };
        }));

        res.json({ items: ticketsWithNames, total, page, totalPages });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /tickets
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = TicketInputSchema.parse(req.body);

        const ticketData = {
            ...data,
            ticketId: `TKT-${Date.now()}`, // Simple ID generation
            status: 'NEW',
            type: 'PROBLEM_SUBMISSION', // Enforce type
            createdByUserId: req.user?.uid,
            createdAt: new Date().toISOString(),
            comments: [],
        };

        const docRef = await db.collection('tickets').add(ticketData);
        const newTicket = await docRef.get();

        res.status(201).json({ id: docRef.id, ...newTicket.data() });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// PATCH /tickets/:id/status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, comment } = StatusUpdateSchema.parse(req.body);

        const ticketRef = db.collection('tickets').doc(id);
        const ticketDoc = await ticketRef.get();

        if (!ticketDoc.exists) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }

        if (!canEditTickets(req.user)) {
            // Optionally, allow creator to close/cancel? For now, imply only mods manage status.
            // Or maybe check if (ticketDoc.data().createdBy === req.user.uid && status === 'CLOSED')?
            // Sticking to strict moderator check for now as requested "specific helpers".
            return res.status(403).json({ error: 'Unauthorized to update ticket status' });
        }

        // Add comment to history
        const newComment = {
            text: comment,
            authorId: req.user?.uid,
            timestamp: new Date().toISOString(),
            type: 'STATUS_CHANGE',
            newStatus: status
        };

        await ticketRef.update({
            status,
            comments: admin.firestore.FieldValue.arrayUnion(newComment)
        });

        // Trigger Approvals on Resolution
        if (status === 'RESOLVED') {
            const ticketData = ticketDoc.data();
            if (ticketData?.type === 'SOLUTION_APPROVAL' && ticketData.solutionId) {
                await db.collection('solutions').doc(ticketData.solutionId).update({ status: 'APPROVED' });
                // Update Index
                try {
                    const solDoc = await db.collection('solutions').doc(ticketData.solutionId).get();
                    if (solDoc.exists) {
                        const solData = { id: solDoc.id, ...solDoc.data() };
                        // We import aiService dynamically or ensure it is imported at top.
                        // Ideally we should inject it or import it.
                        // Assuming imported as 'aiService' from '../services/ai.service' or similar.
                        // Check imports above. If not imported, we need to add import. 
                        // But I can't check imports here easily without reading whole file again. 
                        // 'tickets.ts' usually imports db. Let's assume I need to check imports.
                        // Wait, I can see imports in previous `view_file`.
                        // 'tickets.ts' did NOT import aiService.
                        // So I must add import too.
                        await aiService.indexEntity(solDoc.id, 'solution', solData);
                    }
                } catch (idxErr) {
                    console.error('Failed to strict-index solution on approval:', idxErr);
                }

            } else if (ticketData?.type === 'PARTNER_APPROVAL' && ticketData.partnerId) {
                await db.collection('partners').doc(ticketData.partnerId).update({ status: 'APPROVED' });
                // Update Index
                try {
                    const pDoc = await db.collection('partners').doc(ticketData.partnerId).get();
                    if (pDoc.exists) {
                        const pData = { id: pDoc.id, ...pDoc.data() };
                        await aiService.indexEntity(pDoc.id, 'partner', pData);
                    }
                } catch (idxErr) {
                    console.error('Failed to strict-index partner on approval:', idxErr);
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

export default router;

// PUT /tickets/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('tickets').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (!canEditTickets(req.user, doc.data())) {
            return res.status(403).json({ error: 'Unauthorized to edit tickets' });
        }

        const data = req.body;
        // Don't allow changing sensitive fields via this endpoint
        delete data.id;
        delete data.ticketId;
        delete data.createdByUserId;
        delete data.createdAt;
        delete data.status; // Status should be changed via PATCH /status

        await docRef.update(data);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
