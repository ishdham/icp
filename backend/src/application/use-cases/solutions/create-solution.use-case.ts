import { Solution } from '../../../domain/entities/solution';
import { IRepository } from '../../../domain/interfaces/repository.interface';
import { Partner } from '../../../domain/entities/partner';
import { Ticket } from '../../../domain/entities/ticket';
import { canSubmitSolution } from '@shared/permissions';
import { PermissionUser } from '@shared/types';
import { SolutionSchema } from '@shared/schemas/solutions';

export class CreateSolutionUseCase {
    constructor(
        private solutionRepo: IRepository<Solution>,
        private partnerRepo: IRepository<Partner>,
        private ticketRepo: IRepository<Ticket>
    ) { }

    async execute(data: any, user: PermissionUser): Promise<Solution> {
        if (!canSubmitSolution(user)) {
            throw new Error('Unauthorized: User cannot submit solutions');
        }

        // Validate data against schema (Zod)
        // Note: The raw data might need to be parsed. 
        // We use .parse() to ensure strictly valid per schema.
        // Auto-fields like ID, createdAt, updatedAt are handled by Repository or defaults.
        // We generally validate INPUT here.

        // Remove readonly fields if present to avoid Zod issues or allow them to be stripped?
        // Zod .parse() will strip unknown if strictly set, but here schema has readonly().
        // We should validate the input DTO.

        // Let's assume input data matches schema shape roughly.
        // We can parse with partial or omit validation for server fields?
        // For now, let's trust the schema parsing.

        const validated = SolutionSchema.parse(data);

        // Handle providedByPartnerId
        let providedByPartnerName = undefined;
        if (validated.providedByPartnerId) {
            const partner = await this.partnerRepo.get(validated.providedByPartnerId);
            if (!partner) {
                throw new Error('Invalid providedByPartnerId: Partner not found');
            }
            providedByPartnerName = partner.organizationName;

            // Association Check
            const isAssociated = user.associatedPartners && user.associatedPartners.some((p: any) => p.partnerId === validated.providedByPartnerId && p.status === 'APPROVED');
            // TODO: Check if moderator can override? Assuming moderator can.
            const isModerator = user.role === 'ADMIN' || user.role === 'ICP_SUPPORT';

            if (!isAssociated && !isModerator) {
                throw new Error('You are not associated with this partner');
            }
        }

        const enriched = {
            ...validated,
            providedByPartnerName,
            proposedByUserId: user.uid || user.id,
            proposedByUserName: user.firstName ? `${user.firstName} ${user.lastName}`.trim() : (user.email || 'Unknown'),
            status: validated.status || 'PROPOSED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const createdSolution = await this.solutionRepo.create(enriched);

        // Auto-create approval ticket
        // Note: Repository.create returns T (Solution) which might accept ID but create doesn't guarantee ID return if signature is create(data: T): Promise<T>
        // But FirestoreRepository adds ID.
        // We cast as any to access auto-generated ID if type is strict.
        const solId = (createdSolution as any).id;

        if (solId) {
            await this.ticketRepo.create({
                title: `Approval Request: ${createdSolution.name}`,
                description: `Approval request for solution: ${createdSolution.name}`,
                type: 'SOLUTION_APPROVAL',
                status: 'NEW',
                solutionId: solId,
                createdByUserId: user.uid || user.id,
                createdAt: new Date().toISOString(),
                comments: [],
                ticketId: `TKT-${Date.now()}`
            });
        }

        return createdSolution;
    }
}
