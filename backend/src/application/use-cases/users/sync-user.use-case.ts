import { IUserRepository } from '../../../domain/interfaces/repository.interface';
import { User } from '../../../domain/entities/user';
import { UserInput } from '@shared/schemas/users';
import { admin } from '../../../config/firebase'; // Need admin to check Auth? Or pass DecodedToken?

export class SyncUserUseCase {
    constructor(private userRepo: IUserRepository) { }

    async execute(uid: string, email: string | undefined, otherInfo: Partial<User>): Promise<User> {
        const existing = await this.userRepo.get(uid);
        if (existing) {
            // Update last login or sync info if needed?
            // For now, just return existing.
            return existing;
        }

        // Create new
        const now = new Date().toISOString();
        const newUser: User = {
            id: uid, // Use Auth UID
            uid,
            email: email || '',
            role: 'REGULAR',
            createdAt: now,
            updatedAt: now,
            bookmarks: [],
            associatedPartners: [],
            firstName: otherInfo.firstName || '',
            lastName: otherInfo.lastName || '',
            language: otherInfo.language || 'en',
            discoverySource: otherInfo.discoverySource || '',
            ...otherInfo
        };

        return this.userRepo.create(newUser);
    }
}
