import { IUserRepository } from '../../../domain/interfaces/repository.interface';
import { User } from '../../../domain/entities/user';
import { admin, auth } from '../../../config/firebase';

export class UpdateUserUseCase {
    constructor(private userRepo: IUserRepository) { }

    async execute(uid: string, data: Partial<User>, currentUser: User): Promise<void> {
        // RBAC: Can only update self or if ADMIN
        if (currentUser.role !== 'ADMIN' && currentUser.uid !== uid) {
            throw new Error('Unauthorized');
        }

        // Prevent Role escalation
        if (data.role && data.role !== currentUser.role && currentUser.role !== 'ADMIN') {
            throw new Error('Unauthorized to change role');
        }

        await this.userRepo.update(uid, data);

        // Sync Custom Claims if Role changed (Admin only)
        if (data.role && currentUser.role === 'ADMIN') {
            try {
                await auth.setCustomUserClaims(uid, { role: data.role });
            } catch (e) {
                console.error('Failed to set custom claims', e);
            }
        }
    }
}
