import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import admin from 'firebase-admin';

const router = Router();

import { UserSchema } from '../schemas/users';
import { paginate } from '../utils/pagination';

// GET /users/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'User profile not found' });
            return;
        }
        res.json({ uid: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /users/me
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const data = UserSchema.partial().parse(req.body);
        await db.collection('users').doc(uid).update(data);
        res.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// GET /users/:id - Get specific user
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Allow if Admin or if requesting own profile
        if (req.user?.role !== 'ADMIN' && req.user?.uid !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const doc = await db.collection('users').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /users/:id - Update user
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        // Allow if Admin or if updating own profile
        if (req.user?.role !== 'ADMIN' && req.user?.uid !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const data = req.body;

        // Prevent regular users from changing their own role
        if (req.user?.role !== 'ADMIN' && data.role && data.role !== req.user.role) {
            return res.status(403).json({ error: 'Cannot change own role' });
        }

        await db.collection('users').doc(id).update(data);

        if (data.role && req.user?.role === 'ADMIN') {
            await auth.setCustomUserClaims(id, { role: data.role });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /users/me/bookmarks
console.log('Bookmarks route'); // Debug
router.get('/me/bookmarks', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        const { limit = '20', offset = '0' } = req.query; // Offset based for array
        const limitNum = parseInt(limit as string) || 20;
        const offsetNum = parseInt(offset as string) || 0;

        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const userDoc = await db.collection('users').doc(uid).get();
        const bookmarks = userDoc.data()?.bookmarks || [];

        // Sort by bookmarkedAt desc
        bookmarks.sort((a: any, b: any) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime());

        // Slice
        const slicedBookmarks = bookmarks.slice(offsetNum, offsetNum + limitNum);

        // Enrich with Solution Names
        const enrichedBookmarks = await Promise.all(slicedBookmarks.map(async (b: any) => {
            if (b.solutionId) {
                try {
                    const solDoc = await db.collection('solutions').doc(b.solutionId).get();
                    if (solDoc.exists) {
                        return { ...b, solutionName: solDoc.data()?.name || 'Unknown' };
                    }
                } catch (e) {
                    console.error(`Failed to fetch solution for bookmark ${b.solutionId}`, e);
                }
            }
            return { ...b, solutionName: 'Unknown' };
        }));

        res.json({
            items: enrichedBookmarks,
            total: bookmarks.length,
            limit: limitNum,
            offset: offsetNum
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /users/me/bookmarks
router.post('/me/bookmarks', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        const { solutionId } = req.body;
        if (!uid || !solutionId) {
            res.status(400).json({ error: 'Missing solutionId' });
            return;
        }

        await db.collection('users').doc(uid).update({
            bookmarks: admin.firestore.FieldValue.arrayUnion({
                solutionId,
                bookmarkedAt: new Date().toISOString()
            })
        });
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /users/me/bookmarks/:solutionId
router.delete('/me/bookmarks/:solutionId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        const { solutionId } = req.params;

        // Note: Removing from array of objects is tricky in Firestore if we don't have the exact object.
        // We might need to read, filter, and write back, or change structure to map.
        // For now, let's assume we read-modify-write.

        const userRef = db.collection('users').doc(uid!);
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const bookmarks = doc.data()?.bookmarks || [];
            const newBookmarks = bookmarks.filter((b: any) => b.solutionId !== solutionId);
            t.update(userRef, { bookmarks: newBookmarks });
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /users - List Users (Admin Only)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { role, q, limit = '20', pageToken } = req.query;
        const limitNum = parseInt(limit as string) || 20;
        const token = pageToken as string | undefined;

        let query: FirebaseFirestore.Query = db.collection('users');

        if (role) {
            query = query.where('role', '==', role);
        }

        // Pagination
        const paged = await paginate(query, limitNum, token, 'users');
        let filtersItems = paged.items;

        // In-memory search (Applied AFTER pagination)
        if (q) {
            const search = (q as string).toLowerCase();
            filtersItems = filtersItems.filter((u: any) =>
                u.email?.toLowerCase().includes(search) ||
                u.firstName?.toLowerCase().includes(search) ||
                u.lastName?.toLowerCase().includes(search)
            );
        }

        res.json({ items: filtersItems, nextPageToken: paged.nextPageToken, total: paged.total });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /users/:id - Edit User (Admin Only)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const data = req.body;

        // Prevent modifying sensitive fields if necessary, but for now allow full edit
        // Ideally validate with Zod, but reusing UserSchema might be too strict if we want to edit roles

        await db.collection('users').doc(id).update(data);

        // If role is changed, we might need to update Custom Claims too?
        // For this MVP, we'll assume the 'role' in Firestore is the source of truth for the UI,
        // but for actual security, Custom Claims need to be updated.
        if (data.role) {
            await auth.setCustomUserClaims(id, { role: data.role });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /users/:id/associations - Request Association
router.post('/:id/associations', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { partnerId } = req.body;

        if (!partnerId) {
            return res.status(400).json({ error: 'Missing partnerId' });
        }

        // Allow if requesting for self
        if (req.user?.uid !== id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if partner exists
        const partnerDoc = await db.collection('partners').doc(partnerId).get();
        if (!partnerDoc.exists) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        const userRef = db.collection('users').doc(id);

        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');

            const userData = userDoc.data();
            const associations = userData?.associatedPartners || [];

            // Check if already associated
            const existing = associations.find((a: any) => a.partnerId === partnerId);
            if (existing) {
                if (existing.status === 'REJECTED') {
                    // Start fresh? Or throw? Let's allow retry.
                } else {
                    res.status(400).json({ error: 'Association already exists or pending' });
                    return; // Early return in transaction handler? No, throw to exit or manage logic outside. 
                    // Actually, can't express res inside transaction easily. 
                }
            }

            // We need to handle this logic more cleanly.
        });

        // Simplified: ArrayUnion doesn't work well for "updates" or "checks" inside arrays of objects if we want uniqueness by ID.
        // We have to read-modify-write.

        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            const userData = userDoc.data();
            const associations = userData?.associatedPartners || [];

            // Check if already exists
            const index = associations.findIndex((a: any) => a.partnerId === partnerId);

            const newAssociation = {
                partnerId,
                status: 'PENDING',
                requestedAt: new Date().toISOString()
            };

            if (index > -1) {
                const current = associations[index];
                if (current.status === 'PENDING' || current.status === 'APPROVED') {
                    throw new Error('ALREADY_EXISTS');
                }
                // Override if REJECTED
                associations[index] = newAssociation;
            } else {
                associations.push(newAssociation);
            }

            t.update(userRef, { associatedPartners: associations });
        });

        // Create a ticket for admins to approve
        // We'll create a generic ticket for now.
        const partnerName = partnerDoc.data()?.organizationName;
        const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Unknown';

        await db.collection('tickets').add({
            title: `Association Request: ${userName} - ${partnerName}`,
            description: `User ${userName} (${req.user?.email}) requested association with Partner ${partnerName}`,
            type: 'ASSOCIATION_APPROVAL', // We might need to add this type to schema/tickets.ts if strict, or handled conceptually
            status: 'NEW',
            relatedUserId: id,
            relatedPartnerId: partnerId,
            createdByUserId: req.user?.uid,
            createdAt: new Date().toISOString(),
            comments: [],
            ticketId: `TKT-${Date.now()}`
        });

        res.status(201).json({ success: true });
    } catch (error: any) {
        if (error.message === 'ALREADY_EXISTS') {
            res.status(400).json({ error: 'Association already pending or approved' });
        } else {
            console.error('Error requesting association:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// PUT /users/:id/associations/:partnerId - Approve/Reject (Admin/Support)
router.put('/:id/associations/:partnerId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id, partnerId } = req.params;
        const { status } = req.body; // APPROVED or REJECTED

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Check permissions: Admin or Support
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ICP_SUPPORT') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const userRef = db.collection('users').doc(id);

        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');

            const userData = userDoc.data();
            const associations = userData?.associatedPartners || [];

            const index = associations.findIndex((a: any) => a.partnerId === partnerId);
            if (index === -1) {
                throw new Error('ASSOCIATION_NOT_FOUND');
            }

            associations[index] = {
                ...associations[index],
                status,
                approvedAt: new Date().toISOString()
            };

            t.update(userRef, { associatedPartners: associations });
        });

        res.json({ success: true });
    } catch (error: any) {
        if (error.message === 'ASSOCIATION_NOT_FOUND') {
            res.status(404).json({ error: 'Association request not found' });
        } else {
            console.error('Error updating association:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

export default router;
