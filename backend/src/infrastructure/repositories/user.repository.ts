import { FirestoreRepository } from './firestore.repository';
import { User } from '../../domain/entities/user';
import { SearchResult, FilterOptions } from '../../domain/interfaces/repository.interface';

export class FirestoreUserRepository extends FirestoreRepository<User> {
    constructor() {
        super('users');
    }

    async searchByVector(vector: number[], limit: number): Promise<SearchResult<User>[]> {
        return [];
    }

    async searchByFuzzy(term: string, limit: number): Promise<SearchResult<User>[]> {
        return [];
    }
}
