import { IUserRepository, ITicketRepository, IRepository } from '../../../domain/interfaces/repository.interface';
import { User } from '../../../domain/entities/user';
import { Partner } from '../../../domain/entities/partner';
import { Ticket } from '../../../domain/entities/ticket';

export class ManageAssociationsUseCase {
    constructor(
        private userRepo: IUserRepository,
        private partnerRepo: IRepository<Partner>,
        private ticketRepo: ITicketRepository
    ) { }

    async requestAssociation(uid: string, partnerId: string, currentUser: User): Promise<void> {
        // Can only request for self
        if (currentUser.uid !== uid) throw new Error('Unauthorized');

        const partner = await this.partnerRepo.get(partnerId);
        if (!partner) throw new Error('Partner not found');

        // Update User Association list (Pending)
        // Check duplication logic handled in Repo or here? 
        // Best practice: Repo atomic update or Check-then-Update inside logic.
        // Given Firestore Limit, let's trust `updateAssociation` logic in repo merges/adds.
        // Ideally we check first.
        const user = await this.userRepo.get(uid);
        if (user) {
            const existing = user.associatedPartners?.find(p => p.partnerId === partnerId);
            if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
                throw new Error('Association already exists or pending');
            }
        }

        const association = {
            partnerId,
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
            partnerName: partner.organizationName // Optional enrichment
        };

        await this.userRepo.updateAssociation(uid, association);

        // Create Ticket
        const userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'User';
        const partnerName = partner.organizationName;

        const ticketData: any = { // Cast to any or TicketInput if available, strict typing needed
            title: `Association Request: ${userName} - ${partnerName}`,
            description: `User ${userName} (${currentUser.email}) requested association with Partner ${partnerName}`,
            type: 'ASSOCIATION_APPROVAL' as any, // Add to schema if missing
            status: 'NEW',
            createdByUserId: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Custom fields for logic (Ticket Schema might generally support arbitrary or specific fields?)
            // The original logic saved `relatedUserId` and `relatedPartnerId`. 
            // Standard Ticket Schema has `partnerId` but `relatedUserId`?
            // Let's usage `partnerId` field of Ticket and maybe add `relatedUserId` to schema or generic `data` map?
            // Schema has `partnerId`. `userId` is usually creator. 
            // So we can infer from `createdByUserId` if they are the requester.
            partnerId: partnerId,
            // We rely on `createdByUserId` as the requester.
            ticketId: `TKT-${Date.now()}`,
            comments: []
        };

        await this.ticketRepo.create(ticketData);
    }

    async updateAssociationStatus(uid: string, partnerId: string, status: 'APPROVED' | 'REJECTED', currentUser: User): Promise<void> {
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'ICP_SUPPORT') {
            throw new Error('Unauthorized');
        }

        // Update Association
        const association = {
            partnerId,
            status,
            approvedAt: new Date().toISOString()
        };
        await this.userRepo.updateAssociation(uid, association);
    }
}
