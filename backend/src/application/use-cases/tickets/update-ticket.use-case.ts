import { ITicketRepository } from '../../../domain/interfaces/repository.interface';
import { Ticket } from '../../../domain/entities/ticket';
import { User } from '../../../domain/entities/user';
import { canEditTickets } from '../../../../../shared/permissions';

export class UpdateTicketUseCase {
    constructor(private ticketRepo: ITicketRepository) { }

    async execute(id: string, data: Partial<Ticket>, user: User): Promise<void> {
        const ticket = await this.ticketRepo.get(id);
        if (!ticket) throw new Error('Ticket not found');

        if (!canEditTickets(user, ticket)) {
            throw new Error('Unauthorized to edit tickets');
        }

        // Protected fields logic is in Route or here?
        // Clean Arch: Domain logic here.
        // Prevent updating: id, ticketId, createdByUserId, createdAt, status.
        // Status updates go through specialized Use Case.

        const updates: Partial<Ticket> = { ...data };
        delete updates.id;
        delete updates.ticketId;
        delete updates.createdByUserId;
        delete updates.createdAt;
        delete updates.status;

        await this.ticketRepo.update(id, updates);
    }
}
