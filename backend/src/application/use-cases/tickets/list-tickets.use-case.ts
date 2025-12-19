import { ITicketRepository } from '../../../domain/interfaces/repository.interface';
import { Ticket } from '../../../domain/entities/ticket';

export class ListTicketsUseCase {
    constructor(private ticketRepo: ITicketRepository) { }

    async execute(options: { limit?: number; filters?: any } = {}): Promise<Ticket[]> {
        return this.ticketRepo.list(options.filters);
    }
}
