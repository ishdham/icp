import { FirestoreRepository } from './firestore.repository';
import { Ticket } from '../../domain/entities/ticket';
import { SearchResult, FilterOptions } from '../../domain/interfaces/repository.interface';

export class FirestoreTicketRepository extends FirestoreRepository<Ticket> {
    constructor() {
        super('tickets');
    }

    async searchByVector(vector: number[], limit: number, filter?: FilterOptions): Promise<SearchResult<Ticket>[]> {
        throw new Error('Vector search not supported for Tickets');
    }
}
