import { FirestoreRepository } from './firestore.repository';
import { Ticket } from '../../domain/entities/ticket';
import { SearchResult, FilterOptions } from '../../domain/interfaces/repository.interface';

export class FirestoreTicketRepository extends FirestoreRepository<Ticket> {
    constructor() {
        super('tickets');
    }

    async searchByVector(vector: number[], limit: number): Promise<SearchResult<Ticket>[]> {
        return [];
    }

    async searchByFuzzy(term: string, limit: number): Promise<SearchResult<Ticket>[]> {
        return [];
    }
}
