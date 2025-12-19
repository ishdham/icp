import { ITicketRepository, IRepository } from '../../../domain/interfaces/repository.interface';
import { AIService } from '../../../services/ai.service';
import { Ticket } from '../../../domain/entities/ticket';
import { User } from '../../../domain/entities/user';
import { Partner } from '../../../domain/entities/partner';
import { Solution } from '../../../domain/entities/solution';
import { canEditTickets } from '../../../../../shared/permissions';

export class ResolveTicketUseCase {
    constructor(
        private ticketRepo: ITicketRepository,
        private solutionRepo: IRepository<Solution>,
        private partnerRepo: IRepository<Partner>,
        private aiService: AIService
    ) { }

    async execute(id: string, status: string, comment: string, user: User): Promise<void> {
        const ticket = await this.ticketRepo.get(id);
        if (!ticket) throw new Error('Ticket not found');

        if (!canEditTickets(user)) {
            // Strict check for status update (Moderator only)
            throw new Error('Unauthorized to update ticket status');
        }

        // Add Comment
        const newComment = {
            text: comment,
            authorId: user.uid,
            timestamp: new Date().toISOString(),
            type: 'STATUS_CHANGE',
            newStatus: status
        };
        await this.ticketRepo.addComment(id, newComment);

        // Update Status
        await this.ticketRepo.update(id, { status });

        // Trigger Side Effects if Resolved
        if (status === 'RESOLVED') {
            if (ticket.type === 'SOLUTION_APPROVAL' && ticket.solutionId) {
                await this.solutionRepo.update(ticket.solutionId, { status: 'APPROVED' as any });
                try {
                    const sol = await this.solutionRepo.get(ticket.solutionId);
                    if (sol) {
                        await this.aiService.indexEntity(ticket.solutionId, 'solution', sol);
                    }
                } catch (e) {
                    console.error('Failed to index solution approval', e);
                }
            } else if (ticket.type === 'PARTNER_APPROVAL' && ticket.partnerId) {
                await this.partnerRepo.update(ticket.partnerId, { status: 'APPROVED' as any });
                try {
                    const partner = await this.partnerRepo.get(ticket.partnerId);
                    if (partner) {
                        await this.aiService.indexEntity(ticket.partnerId, 'partner', partner);
                    }
                } catch (e) {
                    console.error('Failed to index partner approval', e);
                }
            }
        }
    }
}
