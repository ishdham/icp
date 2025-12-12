
import { Query } from 'firebase-admin/firestore';
import { db } from '../config/firebase';

export interface PaginationResult<T> {
    items: T[];
    total: number;
    page: number;
    totalPages: number;
}

export const paginate = async <T>(
    query: Query,
    limit: number,
    offset: number,
    collectionName?: string // kept for compatibility but unused now 
): Promise<PaginationResult<T>> => {
    // Run count query
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Run offset-based query
    const snapshot = await query.offset(offset).limit(limit).get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));

    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return { items, total, page, totalPages };
}
