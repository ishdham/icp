import { Router, Response } from 'express';
import admin from 'firebase-admin';
import { db } from '../config/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

import { TicketSchema } from '../schemas/tickets';

const StatusUpdateSchema = z.object({
    status: z.enum(['NEW', 'WIP', 'PENDING', 'RESOLVED', 'REJECTED_NO_RESOLUTION', 'CLOSED']),
    comment: z.string(),
});

// GET /tickets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { status, assignedToMe } = req.query;
        let query: FirebaseFirestore.Query = db.collection('tickets');

        if (status) {
            query = query.where('status', '==', status);
        }

        if (assignedToMe === 'true' && req.user) {
            // Assuming tickets have an 'assignedTo' field or we filter by creator?
            // The requirement says "assigned to the logged-in user".
            // Let's assume there's an 'assignedToUserId' field.
            query = query.where('assignedToUserId', '==', req.user.uid);
        } else if (req.user?.role !== 'ICP_SUPPORT' && req.user?.role !== 'ADMIN') {
            // Regular users should only see their own tickets
            query = query.where('createdByUserId', '==', req.user?.uid);
        }

        const snapshot = await query.get();
        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /tickets
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = TicketSchema.parse(req.body);

        const ticketData = {
            ...data,
            ticketId: `TKT-${Date.now()}`, // Simple ID generation
            status: 'NEW',
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
            } else if (ticketData?.type === 'PARTNER_APPROVAL' && ticketData.partnerId) {
                await db.collection('partners').doc(ticketData.partnerId).update({ status: 'APPROVED' });
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
