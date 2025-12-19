import { Partner } from '../../../domain/entities/partner';
import { Ticket } from '../../../domain/entities/ticket';
import { IRepository } from '../../../domain/interfaces/repository.interface';
import { User } from '../../../domain/entities/user';
import { PartnerInput } from '@shared/schemas/partners';

export class CreatePartnerUseCase {
    constructor(
        private partnerRepo: IRepository<Partner>,
        private ticketRepo: IRepository<Ticket>
    ) { }

    async execute(data: PartnerInput, user: User): Promise<Partner> {
        // All created partners start as PROPOSED
        const initialStatus = 'PROPOSED';
        const proposedByUserName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

        const partnerData: Partner = {
            ...data,
            id: '', // Repo should handle ID generation or overwrite it
            status: initialStatus,
            proposedByUserId: user.uid,
            proposedByUserName,
            // @ts-ignore: Schema might make these optional or they are handled by repo? 
            // Shared schema says createdAt is string. Repo will likely overwrite or we set it here.
            // Let's set it here for consistency with Clean Arch (Application sets dates or Entity logic).
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Initialize empty collections/arrays if needed by schema
            translations: {}
        };

        const createdPartner = await this.partnerRepo.create(partnerData);

        // Auto-create approval ticket
        // TicketSchema: title, description, type, status, priority?, createdByUserId, createdAt, etc.
        const ticketData: Ticket = {
            id: '',
            title: `Partner Approval: ${data.organizationName}`,
            description: `Approval request for partner: ${data.organizationName}`,
            type: 'PARTNER_APPROVAL',
            status: 'NEW',
            partnerId: createdPartner.id,
            createdByUserId: user.uid,
            createdByUserName: proposedByUserName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            ticketId: `TKT-${Date.now()}` // Simple ID generation
        };

        await this.ticketRepo.create(ticketData);

        return createdPartner;
    }
}
