import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { translationService } from '../services/translation.service';

const router = Router();

import { SolutionSchema } from '../schemas/solutions';
import { isModerator, canApproveSolution, canEditSolution } from '../../../shared/permissions';
import { paginate } from '../utils/pagination';


// GET /solutions - Search and Filter
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { q, domain, status, limit = '20', page = '1' } = req.query;
        const limitNum = parseInt(limit as string) || 20;
        const pageNum = parseInt(page as string) || 1;
        const offset = (pageNum - 1) * limitNum;

        let results: any[] = [];
        let total: number = 0;
        let totalPages: number = 0;

        const isMod = isModerator(req.user);

        // helper to enrich data (names)
        const enrichResults = async (items: any[]) => {
            return Promise.all(items.map(async (s: any) => {
                let updates: any = {};
                if (s.providedByPartnerId && !s.providedByPartnerName) {
                    try {
                        const pDoc = await db.collection('partners').doc(s.providedByPartnerId).get();
                        if (pDoc.exists) updates.providedByPartnerName = pDoc.data()?.organizationName;
                    } catch (e) { }
                }
                if (s.proposedByUserId && !s.proposedByUserName) {
                    try {
                        const uDoc = await db.collection('users').doc(s.proposedByUserId).get();
                        if (uDoc.exists) {
                            const u = uDoc.data();
                            updates.proposedByUserName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
                        }
                    } catch (e) { }
                }
                return { ...s, ...updates };
            }));
        };

        // SEARCH MODE (Vector)
        if (q) {
            const searchResults = await aiService.search(q as string, {
                // Fetch enough candidates to filter. 
                // In production, we'd push status filters to the vector DB. 
                // Here we fetch broadly by domain/type and filter in memory for complex permissions.
                limit: 200,
                filters: {
                    type: 'solution',
                    domain: domain as string
                }
            });

            // Map to objects
            let candidates = searchResults.map(r => ({ ...r.metadata, _score: r.score }));

            // Apply Permissions (Filtering Candidates)
            if (isMod) {
                if (status) candidates = candidates.filter((s: any) => s.status === status);
                results = candidates;
            } else if (req.user) {
                if (status) {
                    if (status === 'MATURE') {
                        results = candidates.filter((s: any) => s.status === 'MATURE');
                    } else {
                        results = candidates.filter((s: any) => s.proposedByUserId === req.user!.uid && s.status === status);
                    }
                } else {
                    // Combined: MATURE OR OWN
                    results = candidates.filter((s: any) => s.status === 'MATURE' || s.proposedByUserId === req.user!.uid);
                }
            } else {
                // Anonymous
                results = candidates.filter((s: any) => s.status === 'MATURE');
                if (status && status !== 'MATURE') results = [];
            }

            total = results.length;
            totalPages = Math.ceil(total / limitNum);
            // Paginate
            results = results.slice(offset, offset + limitNum);

            // Enrich
            const enriched = await enrichResults(results);

            // Apply Translations (if cached)
            // Apply Translations (Lazy Translation for Lists)
            const { lang } = req.query;
            if (lang && typeof lang === 'string' && lang !== 'en') {
                const translatedResults = await Promise.all(enriched.map(async (item) => {
                    return await translationService.ensureTranslation(item, 'solutions', lang);
                }));
                return res.json({ items: translatedResults, total, page: pageNum, totalPages });
            }

            return res.json({ items: enriched, total, page: pageNum, totalPages });
        }

        // STANDARD LIST MODE (No Search)
        // ... (Existing Logic using Firestore Paginate or Fetch All) ...

        // Base Query Helper
        const buildQuery = (collection: FirebaseFirestore.CollectionReference) => {
            let query: FirebaseFirestore.Query = collection;
            if (domain) query = query.where('domain', '==', domain);
            return query;
        };

        const runPaged = async (query: FirebaseFirestore.Query) => {
            return paginate(query, limitNum, offset);
        };

        // CASE 1: Moderator -> See everything
        if (isMod) {
            let query = buildQuery(db.collection('solutions'));
            if (status) query = query.where('status', '==', status);

            const paged = await runPaged(query);
            results = paged.items;
            total = paged.total;
            totalPages = paged.totalPages;
        }
        // CASE 2: Regular User -> See MATURE OR Own
        else if (req.user) {
            const solutionsRef = db.collection('solutions');

            if (status) {
                if (status === 'MATURE') {
                    let query = buildQuery(solutionsRef).where('status', '==', 'MATURE');
                    const paged = await runPaged(query);
                    results = paged.items;
                    total = paged.total;
                    totalPages = paged.totalPages;
                } else {
                    // Own solutions with specific status
                    let query = buildQuery(solutionsRef)
                        .where('proposedByUserId', '==', req.user.uid)
                        .where('status', '==', status);
                    const paged = await runPaged(query);
                    results = paged.items;
                    total = paged.total;
                    totalPages = paged.totalPages;
                }
            } else {
                // Combined View (Mature + Own)
                // We use Fetch All & Slice strategy here too since we don't have 'q' but need logic
                const matureQuery = buildQuery(solutionsRef).where('status', '==', 'MATURE');
                const ownQuery = buildQuery(solutionsRef).where('proposedByUserId', '==', req.user.uid);

                const [matureDocs, ownDocs] = await Promise.all([
                    matureQuery.get(),
                    ownQuery.get()
                ]);

                const map = new Map();
                matureDocs.docs.forEach((d: any) => map.set(d.id, { id: d.id, ...d.data() }));
                ownDocs.docs.forEach((d: any) => map.set(d.id, { id: d.id, ...d.data() }));

                let combined = Array.from(map.values());

                // Sort by ID 
                combined.sort((a, b) => a.id.localeCompare(b.id));

                total = combined.length;
                totalPages = Math.ceil(total / limitNum);
                results = combined.slice(offset, offset + limitNum);
            }
        }
        // CASE 3: Anonymous -> See MATURE only
        else {
            if (status && status !== 'MATURE') {
                results = [];
                total = 0;
                totalPages = 0;
            } else {
                let query = buildQuery(db.collection('solutions')).where('status', '==', 'MATURE');
                const paged = await runPaged(query);
                results = paged.items;
                total = paged.total;
                totalPages = paged.totalPages;
            }
        }

        // Aggregate Names (Post-Fetch for Standard Mode)
        const enriched = await enrichResults(results);

        // Apply Translations (if cached)
        // Apply Translations (Lazy Translation for Lists)
        const { lang } = req.query;
        if (lang && typeof lang === 'string' && lang !== 'en') {
            const translatedResults = await Promise.all(enriched.map(async (item) => {
                return await translationService.ensureTranslation(item, 'solutions', lang);
            }));
            return res.json({ items: translatedResults, total, page: pageNum, totalPages });
        }

        res.json({ items: enriched, total, page: pageNum, totalPages });

    } catch (error) {
        console.error('Error fetching solutions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /solutions - Create Solution
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = SolutionSchema.parse(req.body);

        // All created solutions start as PROPOSED
        const initialStatus = 'PROPOSED';

        // Auto-populate user info
        const proposedByUserId = req.user?.uid;
        const proposedByUserName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Unknown';

        // Handle providedByPartnerId
        let providedByPartnerName = undefined;
        if (data.providedByPartnerId) {
            // Validate Partner exists
            const partnerDoc = await db.collection('partners').doc(data.providedByPartnerId).get();
            if (!partnerDoc.exists) {
                return res.status(400).json({ error: 'Invalid providedByPartnerId: Partner not found' });
            }
            providedByPartnerName = partnerDoc.data()?.organizationName;

            // Optional: Check if user is associated with this partner?
            // "The user clarified that providerId is a Partner". 
            // If strict, we should check association. 
            // Reuse canApproveSolution logic or specific association check.
            const canApprove = canApproveSolution(req.user);
            if (!canApprove) {
                const isAssociated = req.user?.associatedPartners?.some((p: any) => p.partnerId === data.providedByPartnerId && p.status === 'APPROVED');
                if (!isAssociated) {
                    return res.status(403).json({ error: 'You are not associated with this partner' });
                }
            }
        }

        const solutionData = {
            ...data,
            status: initialStatus,
            proposedByUserId,
            proposedByUserName,
            providedByPartnerName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('solutions').add(solutionData);
        const newSolution = await docRef.get();

        // Auto-create approval ticket
        await db.collection('tickets').add({
            title: `Approval Request: ${data.name}`,
            description: `Approval request for solution: ${data.name}`,
            type: 'SOLUTION_APPROVAL',
            status: 'NEW',
            solutionId: docRef.id,
            createdByUserId: req.user?.uid,
            createdAt: new Date().toISOString(),
            comments: [],
            ticketId: `TKT-${Date.now()}`
        });

        res.status(201).json({ id: docRef.id, ...newSolution.data() });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
        } else {
            console.error('Error creating solution:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// GET /solutions/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { lang } = req.query;
        if (lang && typeof lang === 'string' && lang !== 'en') {
            try {
                const translated = await translationService.getTranslatedEntity(req.params.id, 'solutions', lang);
                return res.json({ id: req.params.id, ...translated });
            } catch (e: any) {
                // If not found or error, fall back to normal fetch or 404
                if (e.message && e.message.includes('not found')) {
                    return res.status(404).json({ error: 'Solution not found' });
                }
                console.error('Translation error:', e);
                // Fallthrough to normal fetch
            }
        }

        const doc = await db.collection('solutions').doc(req.params.id).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Solution not found' });
            return;
        }

        const data = doc.data() as any;
        res.json({ id: doc.id, ...data });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /solutions/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const docRef = db.collection('solutions').doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Solution not found' });
        }

        const existingSolution = { id: doc.id, ...doc.data() } as any;

        if (!canEditSolution(req.user, existingSolution)) {
            return res.status(403).json({ error: 'Unauthorized to edit this solution' });
        }

        const data = req.body;

        // Handle providedByPartnerId change
        if (data.providedByPartnerId && data.providedByPartnerId !== existingSolution.providedByPartnerId) {
            const partnerDoc = await db.collection('partners').doc(data.providedByPartnerId).get();
            if (!partnerDoc.exists) {
                return res.status(400).json({ error: 'Invalid providedByPartnerId: Partner not found' });
            }
            data.providedByPartnerName = partnerDoc.data()?.organizationName;

            // Check permissions for new partner
            if (!canApproveSolution(req.user)) {
                const isAssociated = req.user?.associatedPartners?.some((p: any) => p.partnerId === data.providedByPartnerId && p.status === 'APPROVED');
                if (!isAssociated) {
                    return res.status(403).json({ error: 'You are not associated with this partner' });
                }
            }
        }

        // Prevent status change if not authorized
        if (data.status && data.status !== existingSolution.status) {
            if (!canApproveSolution(req.user)) {
                return res.status(403).json({ error: 'Unauthorized to change status' });
            }
        }

        // Always update updatedAt
        data.updatedAt = new Date().toISOString();

        const { lang } = req.query;
        if (lang && typeof lang === 'string' && lang !== 'en') {
            // Update Translation Only
            const updateData = {
                [`translations.${lang}`]: data
            };
            // Note: This replaces the whole translation object for that lang if we use dot notation with object value?
            // Actually, data contains ALL fields from the form.
            // We only want to save the translatable fields to translations.
            // But simplest way is to save what we got. 
            // Ideally we filter fields. 
            // Use merge: true is not applicable for update() unless using set().
            // update({'translations.hi': data}) will replace the map at translations.hi with data.
            // This is acceptable if data contains the full form for that language.

            await docRef.update({
                [`translations.${lang}`]: data,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Normal Update (Base Language)
            await docRef.update(data);
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
