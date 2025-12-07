import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import admin from 'firebase-admin';

const router = Router();

import { UserSchema } from '../schemas/users';

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
router.get('/me/bookmarks', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const userDoc = await db.collection('users').doc(uid).get();
        const bookmarks = userDoc.data()?.bookmarks || [];
        res.json(bookmarks);
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

        const { role, q } = req.query;
        let query: FirebaseFirestore.Query = db.collection('users');

        if (role) {
            query = query.where('role', '==', role);
        }

        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // In-memory search
        let filteredUsers = users;
        if (q) {
            const search = (q as string).toLowerCase();
            filteredUsers = users.filter((u: any) =>
                u.email?.toLowerCase().includes(search) ||
                u.firstName?.toLowerCase().includes(search) ||
                u.lastName?.toLowerCase().includes(search)
            );
        }

        res.json(filteredUsers);
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

export default router;
