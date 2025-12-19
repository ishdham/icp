import { FirestoreRepository } from './firestore.repository';
import { Ticket } from '../../domain/entities/ticket';
import { ITicketRepository, SearchResult, TicketComment } from '../../domain/interfaces/repository.interface';
import { db } from '../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export class FirestoreTicketRepository extends FirestoreRepository<Ticket> implements ITicketRepository {
    constructor() {
        super('tickets');
    }

    async addComment(ticketId: string, comment: TicketComment): Promise<void> {
        await db.collection(this.collectionName).doc(ticketId).update({
            comments: FieldValue.arrayUnion(comment),
            updatedAt: new Date().toISOString()
        });
    }

    async searchByVector(vector: number[], limit: number): Promise<SearchResult<Ticket>[]> {
        return [];
    }

    async searchByFuzzy(term: string, limit: number): Promise<SearchResult<Ticket>[]> {
        // Basic implementation or keep empty if not used
        return [];
    }
}
