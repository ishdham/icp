import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { canSeeTickets } from '../../../shared/permissions';

const router = Router();

// Helper to estimate count for combined view (Union of A and B)
// Since Firestore doesn't support OR queries natively for counts on different fields easily without limits,
// and we want exact counts if possible, but approximation might be okay if exact is too expensive.
// However, for "My Solutions" vs "Mature Solutions", the detailed logic is:
// 1. Mature (Everyone sees specific subset)
// 2. Proposed by Me (I see them)
// Intersection: Proposed by Me AND Mature.
// So Total = Count(Mature) + Count(ProposedByMe) - Count(ProposedByMe AND Mature).
const getCombinedCount = async (collection: string, userUid: string) => {
    const colRef = db.collection(collection);

    // 1. Mature Count
    const matureQuery = colRef.where('status', '==', 'MATURE');
    const matureSnap = await matureQuery.count().get();
    const matureCount = matureSnap.data().count;

    // 2. Proposed By Me (All statuses)
    const myQuery = colRef.where('proposedByUserId', '==', userUid);
    const mySnap = await myQuery.count().get();
    const myCount = mySnap.data().count;

    // 3. Intersection: Proposed By Me AND Mature
    const intersectionQuery = colRef
        .where('proposedByUserId', '==', userUid)
        .where('status', '==', 'MATURE');
    const interSnap = await intersectionQuery.count().get();
    const interCount = interSnap.data().count;

    return matureCount + myCount - interCount;
};

// GET /stats - Returns counts for dashboard
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
    try {
        let solutionsCount = 0;
        let partnersCount = 0;
        let ticketsCount = 0;

        const isMod = req.user && (req.user.role === 'ADMIN' || req.user.role === 'ICP_SUPPORT');

        // --- Solutions & Partners ---
        if (isMod) {
            // Admin/Mod sees EVERYTHING
            const sSnap = await db.collection('solutions').count().get();
            const pSnap = await db.collection('partners').count().get();
            solutionsCount = sSnap.data().count;
            partnersCount = pSnap.data().count;
        } else if (req.user) {
            // Regular User: Mature OR ProposedByMe
            solutionsCount = await getCombinedCount('solutions', req.user.uid);
            partnersCount = await getCombinedCount('partners', req.user.uid);
        } else {
            // Anonymous: Mature ONLY
            const sSnap = await db.collection('solutions').where('status', '==', 'MATURE').count().get();
            const pSnap = await db.collection('partners').where('status', '==', 'MATURE').count().get();
            solutionsCount = sSnap.data().count;
            partnersCount = pSnap.data().count;
        }

        // --- Tickets ---
        if (req.user) {
            if (canSeeTickets(req.user)) {
                // Admin/Support sees ALL tickets
                const tSnap = await db.collection('tickets').count().get();
                ticketsCount = tSnap.data().count;
            } else {
                // Regular User: CreatedByMe OR AssignedToMe
                // Intersection: CreatedByMe AND AssignedToMe (rare but possible)
                const ticketsRef = db.collection('tickets');

                const createdSnap = await ticketsRef.where('createdByUserId', '==', req.user.uid).count().get();
                const assignedSnap = await ticketsRef.where('assignedToUserId', '==', req.user.uid).count().get();
                const interSnap = await ticketsRef
                    .where('createdByUserId', '==', req.user.uid)
                    .where('assignedToUserId', '==', req.user.uid)
                    .count().get();

                ticketsCount = createdSnap.data().count + assignedSnap.data().count - interSnap.data().count;
            }
        } else {
            // Anonymous sees 0 tickets
            ticketsCount = 0;
        }

        res.json({
            solutions: solutionsCount,
            partners: partnersCount,
            tickets: ticketsCount
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
