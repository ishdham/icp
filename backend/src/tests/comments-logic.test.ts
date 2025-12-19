
import { CreateTicketUseCase } from '../application/use-cases/tickets/create-ticket.use-case';
import { ResolveTicketUseCase } from '../application/use-cases/tickets/resolve-ticket.use-case';
import { ITicketRepository } from '../domain/interfaces/repository.interface';
import { User } from '../domain/entities/user';
import { TicketInput } from '@shared/schemas/tickets';
import { AIService } from '../services/ai.service'; // Mock

describe('Ticket Comments Logic', () => {
    let mockRepo: ITicketRepository;
    let createUseCase: CreateTicketUseCase;
    let resolveUseCase: ResolveTicketUseCase;
    let mockAiService: AIService;

    const mockUser: User = {
        uid: 'user1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'REGULAR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    beforeEach(() => {
        mockRepo = {
            create: jest.fn().mockImplementation((t) => Promise.resolve({ ...t, id: 't1' })),
            update: jest.fn().mockResolvedValue(undefined),
            get: jest.fn(),
            addComment: jest.fn().mockResolvedValue(undefined),
            list: jest.fn(),
            delete: jest.fn(),
            searchByVector: jest.fn(),
            searchByFuzzy: jest.fn()
        };
        mockAiService = {
            indexEntity: jest.fn()
        } as any;

        createUseCase = new CreateTicketUseCase(mockRepo);
        resolveUseCase = new ResolveTicketUseCase(mockRepo, {} as any, {} as any, mockAiService);
    });

    it('should add an initial comment when creating a ticket', async () => {
        const input: TicketInput = {
            title: 'New Problem',
            description: 'Desc',
            type: 'PROBLEM_SUBMISSION',
            status: 'NEW'
        };

        const result = await createUseCase.execute(input, mockUser);

        expect(mockRepo.create).toHaveBeenCalled();
        const createdTicket = (mockRepo.create as jest.Mock).mock.calls[0][0];
        expect(createdTicket.comments).toHaveLength(1);
        expect(createdTicket.comments[0].content).toContain('Ticket created by Test User');
        expect(createdTicket.comments[0].userId).toBe('user1');
    });

    it('should add a resolution comment when resolving a ticket', async () => {
        (mockRepo.get as jest.Mock).mockResolvedValue({
            id: 't1',
            status: 'NEW',
            type: 'PROBLEM_SUBMISSION'
        });

        // Mock permission check if needed? 
        // Logic checks `canEditTickets`. But `canEditTickets` is imported. 
        // If it's a pure function, we need a user that passes.
        // Admin user for resolution.
        const adminUser = { ...mockUser, role: 'ADMIN' } as any;

        await resolveUseCase.execute('t1', 'RESOLVED', 'Approved!', adminUser);

        expect(mockRepo.addComment).toHaveBeenCalled();
        const callArgs = (mockRepo.addComment as jest.Mock).mock.calls[0];
        expect(callArgs[0]).toBe('t1');
        const comment = callArgs[1];
        expect(comment.content).toContain('Approved!');
        expect(comment.content).toContain('Status changed to RESOLVED');
        expect(comment.userId).toBe('user1');
        expect(comment.id).toBeDefined();
    });
});
