import { db } from '../../config/firebase';
import { IRepository, FilterOptions, SearchResult } from '../../domain/interfaces/repository.interface';
import { DocumentData, Query } from 'firebase-admin/firestore';

export abstract class FirestoreRepository<T extends { id?: string }> implements IRepository<T> {
    protected collectionName: string;

    constructor(collectionName: string) {
        this.collectionName = collectionName;
    }

    async create(data: T): Promise<T> {
        const docRef = db.collection(this.collectionName).doc();
        const now = new Date().toISOString();
        const item = {
            ...data,
            id: docRef.id,
            createdAt: now,
            updatedAt: now
        };
        await docRef.set(item);
        return item as T;
    }

    async get(id: string): Promise<T | null> {
        const doc = await db.collection(this.collectionName).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as T;
    }

    async update(id: string, data: Partial<T>): Promise<void> {
        await db.collection(this.collectionName).doc(id).update({
            ...data,
            updatedAt: new Date().toISOString()
        });
    }

    async list(filter?: FilterOptions): Promise<T[]> {
        let query: Query<DocumentData> = db.collection(this.collectionName);

        if (filter) {
            Object.entries(filter).forEach(([key, value]) => {
                if (value !== undefined) {
                    query = query.where(key, '==', value);
                }
            });
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    }

    async delete(id: string): Promise<void> {
        await db.collection(this.collectionName).doc(id).delete();
    }

    abstract searchByVector(vector: number[], limit: number, filter?: FilterOptions): Promise<SearchResult<T>[]>;
}
