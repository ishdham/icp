import request from 'supertest';
import app from '../app';
import { db, auth, resetMocks, mockGet, mockAdd, mockVerifyIdToken, mockUpdate } from './mocks';

// Mock the firebase config module
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

jest.mock('firebase-admin', () => ({
    firestore: {
        FieldValue: {
            arrayUnion: jest.fn((val) => val)
        }
    },
    auth: () => require('./mocks').auth,
    credential: {
        cert: jest.fn()
    }
}));

jest.mock('../container', () => ({
    listTicketsUseCase: { execute: jest.fn() },
    createTicketUseCase: { execute: jest.fn() },
    getTicketUseCase: { execute: jest.fn() },
    updateTicketUseCase: { execute: jest.fn() },
    resolveTicketUseCase: { execute: jest.fn() },
    searchPartnersUseCase: { execute: jest.fn() },
    createPartnerUseCase: { execute: jest.fn() },
    getPartnerUseCase: { execute: jest.fn() },
    updatePartnerUseCase: { execute: jest.fn() },
    searchSolutionsUseCase: { execute: jest.fn() },
    solutionsRepository: {},
    partnerRepository: {},
    ticketRepository: {},
    aiService: { indexEntity: jest.fn().mockResolvedValue(undefined) }
}));

import {
    listTicketsUseCase,
    createTicketUseCase,
    updateTicketUseCase,
    resolveTicketUseCase
} from '../container';

describe('Tickets API', () => {
    beforeEach(() => {
        resetMocks();
        (listTicketsUseCase.execute as jest.Mock).mockReset();
        (createTicketUseCase.execute as jest.Mock).mockReset();
        (updateTicketUseCase.execute as jest.Mock).mockReset();
        (resolveTicketUseCase.execute as jest.Mock).mockReset();
    });

    describe('GET /v1/tickets', () => {
        it('should return a list of tickets', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });

            (listTicketsUseCase.execute as jest.Mock).mockResolvedValue([
                { id: '1', title: 'Ticket 1', status: 'NEW', createdByUserId: 'user123' }
            ]);

            const res = await request(app)
                .get('/v1/tickets')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(res.body.items[0].title).toBe('Ticket 1');
            expect(listTicketsUseCase.execute).toHaveBeenCalled();
        });
    });

    describe('POST /v1/tickets', () => {
        it('should create a ticket', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });

            (createTicketUseCase.execute as jest.Mock).mockResolvedValue({
                id: 't1',
                title: 'Problem',
                status: 'NEW'
            });

            const res = await request(app)
                .post('/v1/tickets')
                .set('Authorization', 'Bearer token')
                .send({
                    title: 'Problem',
                    description: 'Desc',
                    type: 'PROBLEM_SUBMISSION',
                    status: 'NEW'
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('t1');
            expect(createTicketUseCase.execute).toHaveBeenCalled();
        });
    });

    describe('PATCH /v1/tickets/:id/status', () => {
        it('should resolve ticket', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'admin123', role: 'ADMIN' });
            (resolveTicketUseCase.execute as jest.Mock).mockResolvedValue(undefined);

            const res = await request(app)
                .patch('/v1/tickets/t1/status')
                .set('Authorization', 'Bearer token')
                .send({
                    status: 'RESOLVED',
                    comment: 'Done'
                });

            expect(res.status).toBe(200);
            expect(resolveTicketUseCase.execute).toHaveBeenCalledWith('t1', 'RESOLVED', 'Done', expect.anything());
        });
    });

    describe('PUT /v1/tickets/:id', () => {
        it('should update ticket', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });
            (updateTicketUseCase.execute as jest.Mock).mockResolvedValue(undefined);

            const res = await request(app)
                .put('/v1/tickets/t1')
                .set('Authorization', 'Bearer token')
                .send({
                    title: 'Updated Title'
                });

            expect(res.status).toBe(200);
            expect(updateTicketUseCase.execute).toHaveBeenCalledWith('t1', expect.objectContaining({ title: 'Updated Title' }), expect.anything());
        });

        it('should allow updating comments', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });
            (updateTicketUseCase.execute as jest.Mock).mockResolvedValue(undefined);

            const comments = [{ id: 'c1', content: 'New Comment', userId: 'user123', createdAt: '2023-01-01' }];

            const res = await request(app)
                .put('/v1/tickets/t1')
                .set('Authorization', 'Bearer token')
                .send({
                    comments
                });

            expect(res.status).toBe(200);
            expect(updateTicketUseCase.execute).toHaveBeenCalledWith(
                't1',
                expect.objectContaining({ comments }),
                expect.anything()
            );
        });
    });
});
