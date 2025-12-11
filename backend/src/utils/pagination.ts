
import { Query } from 'firebase-admin/firestore';
import { db } from '../config/firebase';

export interface PaginationResult<T> {
    items: T[];
    nextPageToken: string | null;
    total: number;
}

export const paginate = async <T>(
    query: Query,
    limit: number,
    pageToken?: string,
    collectionName?: string
): Promise<PaginationResult<T>> => {
    // Run count query in parallel/before pagination to get total matches
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    let finalQuery = query.limit(limit);

    if (pageToken && collectionName) {
        try {
            // Assume pageToken is the doc ID
            // We fetch the doc to get the snapshot for reliable cursor
            const docRef = db.collection(collectionName).doc(pageToken);
            const docSnapshot = await docRef.get();

            if (docSnapshot.exists) {
                finalQuery = finalQuery.startAfter(docSnapshot);
            } else {
                console.warn(`Pagination cursor doc ${pageToken} not found in ${collectionName}`);
            }
        } catch (e) {
            console.error("Pagination Error:", e);
        }
    }

    const snapshot = await finalQuery.get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

    // Check if we have more
    // A robust way often fetches limit + 1
    // But since we are using startAfter, knowing "next" is hard without over-fetching.
    // Let's stick to returning the last ID as token if we got a full page.
    let nextPageToken: string | null = null;
    if (items.length === limit) {
        const lastItem = items[items.length - 1] as any;
        nextPageToken = lastItem.id;
    }

    return { items, nextPageToken, total };
}
