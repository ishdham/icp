import { IUserRepository } from '../../../domain/interfaces/repository.interface';
import { User } from '../../../domain/entities/user';
import { FilterOptions } from '../../../domain/interfaces/repository.interface';

export class ListUsersUseCase {
    constructor(private userRepo: IUserRepository) { }

    async execute(options: {
        limit?: number;
        offset?: number;
        filters?: { role?: string };
        search?: string;
    } = {}): Promise<{ items: User[], total: number }> {
        // NOTE: Generic Repo 'list' returns array. If we want true pagination + search, 
        // we heavily rely on implementation or simply fetch-all-and-slice for MVP (as generic repo is simple).
        // Current Generic Repo `.list` supports simple exact match filters.

        const filters: FilterOptions = {};
        if (options.filters?.role) filters.role = options.filters.role;

        let users = await this.userRepo.list(filters);

        // In-memory search (Generic Fuzzy Search is on Repo but maybe not implemented fully yet or we use simple filter)
        if (options.search) {
            const term = options.search.toLowerCase();
            users = users.filter(u =>
                (u.email || '').toLowerCase().includes(term) ||
                (u.firstName || '').toLowerCase().includes(term) ||
                (u.lastName || '').toLowerCase().includes(term)
            );
        }

        const total = users.length;
        const limit = options.limit || 20;
        const offset = options.offset || 0;

        const items = users.slice(offset, offset + limit);

        return { items, total };
    }
}
