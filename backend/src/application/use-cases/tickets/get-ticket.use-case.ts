import { ITicketRepository } from '../../../domain/interfaces/repository.interface';
import { Ticket } from '../../../domain/entities/ticket';

export class GetTicketUseCase {
    constructor(private ticketRepo: ITicketRepository) { }

    async execute(id: string): Promise<Ticket | null> {
        return this.ticketRepo.get(id);
    }
}
