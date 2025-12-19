import { FirestoreRepository } from './firestore.repository';
import { User } from '../../domain/entities/user';
import { db } from '../../config/firebase';
import { IUserRepository, SearchResult } from '../../domain/interfaces/repository.interface';
import { FieldValue } from 'firebase-admin/firestore';

export class FirestoreUserRepository extends FirestoreRepository<User> implements IUserRepository {
    constructor() {
        super('users');
    }

    async addBookmark(userId: string, bookmark: any): Promise<void> {
        await db.collection(this.collectionName).doc(userId).update({
            bookmarks: FieldValue.arrayUnion(bookmark)
        });
    }

    async removeBookmark(userId: string, solutionId: string): Promise<void> {
        // Need read-modify-write as we filter by ID
        const docRef = db.collection(this.collectionName).doc(userId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) return;
            const data = doc.data();
            const bookmarks = data?.bookmarks || [];
            const newBookmarks = bookmarks.filter((b: any) => b.solutionId !== solutionId);
            t.update(docRef, { bookmarks: newBookmarks });
        });
    }

    async updateAssociation(userId: string, association: any): Promise<void> {
        const docRef = db.collection(this.collectionName).doc(userId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) return;
            const data = doc.data();
            const associations = data?.associatedPartners || [];

            // Check if exists
            const index = associations.findIndex((a: any) => a.partnerId === association.partnerId);
            if (index > -1) {
                // Merge/Update
                associations[index] = { ...associations[index], ...association };
            } else {
                // Add
                associations.push(association);
            }
            t.update(docRef, { associatedPartners: associations });
        });
    }

    async searchByVector(vector: number[], limit: number): Promise<SearchResult<User>[]> {
        return [];
    }

    async searchByFuzzy(term: string, limit: number): Promise<SearchResult<User>[]> {
        return [];
    }
}
