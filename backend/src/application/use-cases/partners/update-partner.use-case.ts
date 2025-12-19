import { Partner } from '../../../domain/entities/partner';
import { IRepository } from '../../../domain/interfaces/repository.interface';
import { User } from '../../../domain/entities/user';
import { canEditPartner, canApprovePartner } from '@shared/permissions';

export class UpdatePartnerUseCase {
    constructor(private partnerRepo: IRepository<Partner>) { }

    async execute(id: string, data: Partial<Partner>, user: User): Promise<void> {
        const existingPartner = await this.partnerRepo.get(id);
        if (!existingPartner) {
            throw new Error('Partner not found');
        }

        if (!canEditPartner(user, existingPartner)) {
            throw new Error('Unauthorized to edit this partner');
        }

        // RBAC status check
        if (data.status && data.status !== existingPartner.status) {
            if (!canApprovePartner(user)) {
                throw new Error('Unauthorized to change status');
            }
        }

        const updates: Partial<Partner> = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        if (updates.id) delete updates.id; // Prevent ID update

        await this.partnerRepo.update(id, updates);
    }
}
