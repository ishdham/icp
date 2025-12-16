import { FirestoreRepository } from './firestore.repository';
import { User } from '../../domain/entities/user';
import { SearchResult, FilterOptions } from '../../domain/interfaces/repository.interface';

export class FirestoreUserRepository extends FirestoreRepository<User> {
    constructor() {
        super('users');
    }

    async searchByVector(vector: number[], limit: number, filter?: FilterOptions): Promise<SearchResult<User>[]> {
        throw new Error('Vector search not supported for Users');
    }
}
