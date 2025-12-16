import { Solution } from '../../../domain/entities/solution';
import { IRepository } from '../../../domain/interfaces/repository.interface';
import { canEditSolution } from '@shared/permissions';
import { PermissionUser } from '@shared/types';
import { SolutionSchema } from '@shared/schemas/solutions';

export class UpdateSolutionUseCase {
    constructor(private solutionRepo: IRepository<Solution>) { }

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

        await this.solutionRepo.update(id, data);
    }
}
