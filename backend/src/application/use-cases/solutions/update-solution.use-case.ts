import { Solution } from '../../../domain/entities/solution';
import { Partner } from '../../../domain/entities/partner';
import { IRepository } from '../../../domain/interfaces/repository.interface';
import { canEditSolution } from '@shared/permissions';
import { PermissionUser } from '@shared/types';
import { SolutionSchema } from '@shared/schemas/solutions';

export class UpdateSolutionUseCase {
    constructor(
        private solutionRepo: IRepository<Solution>,
        private partnerRepo: IRepository<Partner>
    ) { }

    async execute(id: string, data: Partial<Solution>, user: PermissionUser): Promise<void> {
        const existing = await this.solutionRepo.get(id);
        if (!existing) {
            throw new Error('Solution not found');
        }

        if (!canEditSolution(user, existing)) {
            throw new Error('Unauthorized: User cannot edit this solution');
        }

        // Validate Partial Data?
        // SolutionSchema.partial().parse(data);

        // Check if partner ID is being updated
        if (data.providedByPartnerId && data.providedByPartnerId !== existing.providedByPartnerId) {
            const partner = await this.partnerRepo.get(data.providedByPartnerId);
            if (partner) {
                // Denormalize partner name
                data.providedByPartnerName = partner.organizationName;
            } else {
                throw new Error('Invalid providedByPartnerId: Partner not found');
            }
        }

        await this.solutionRepo.update(id, data);
    }
}
