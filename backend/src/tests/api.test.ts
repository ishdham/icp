import request from 'supertest';
import app from '../app';
import { db, auth, resetMocks, mockGet, mockAdd, mockVerifyIdToken, mockUpdate } from './mocks';

// Mock the firebase config module
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

describe('ICP Backend API', () => {
    beforeEach(() => {
        resetMocks();
    });

    const mockAuthUser = (uid: string, role: string = 'REGULAR') => {
        mockVerifyIdToken.mockResolvedValue({ uid, email: `${uid}@example.com`, role });
        // Mock Firestore User Doc Get for authenticate middleware
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ uid, role })
        });
    };

    describe('GET /v1/solutions', () => {
        it('should return a list of solutions', async () => {
            // Mock Firestore response
            mockGet.mockResolvedValue({
                docs: [
                    { id: '1', data: () => ({ name: 'Clean Water', status: 'APPROVED' }) },
                    { id: '2', data: () => ({ name: 'Solar Energy', status: 'APPROVED' }) },
                ],
            });

            const res = await request(app).get('/v1/solutions');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(2);
            expect(res.body.items[0].name).toBe('Clean Water');
        });
    });

    describe('POST /v1/solutions', () => {
        it('should create a solution when authenticated', async () => {
            mockAuthUser('user123', 'REGULAR');

            // Mock Firestore Add
            mockAdd.mockResolvedValue({
                id: 'new-sol-id',
                get: jest.fn().mockResolvedValue({
                    data: () => ({ name: 'New Solution', status: 'DRAFT' })
                })
            });

            const res = await request(app)
                .post('/v1/solutions')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    name: 'New Solution',
                    description: 'A great solution',
                    domain: 'Water',
                    status: 'DRAFT',
                    uniqueValueProposition: 'Unique',
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('new-sol-id');
            expect(mockVerifyIdToken).toHaveBeenCalled();
        });

        it('should force status to PENDING and create a ticket for regular users', async () => {
            mockAuthUser('user123', 'REGULAR');

            mockAdd.mockResolvedValue({
                id: 'new-sol-id',
                get: jest.fn().mockResolvedValue({
                    data: () => ({ name: 'New Solution', status: 'PENDING' })
                })
            });

            const res = await request(app)
                .post('/v1/solutions')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    name: 'New Solution',
                    description: 'A great solution',
                    domain: 'Water',
                    status: 'APPROVED',
                    uniqueValueProposition: 'Unique',
                });

            expect(res.status).toBe(201);

            // Verify Solution creation with PENDING
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                status: 'PENDING'
            }));

            // Verify Ticket creation
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'SOLUTION_APPROVAL',
                solutionId: 'new-sol-id'
            }));
        });

        it('should allow ADMIN to create APPROVED solution without ticket', async () => {
            mockAuthUser('admin123', 'ADMIN');

            mockAdd.mockResolvedValue({
                id: 'admin-sol-id',
                get: jest.fn().mockResolvedValue({
                    data: () => ({ name: 'Admin Solution', status: 'APPROVED' })
                })
            });

            await request(app)
                .post('/v1/solutions')
                .set('Authorization', 'Bearer admin-token')
                .send({
                    name: 'Admin Solution',
                    description: 'Official solution',
                    domain: 'Energy',
                    status: 'APPROVED',
                    uniqueValueProposition: 'Official',
                });

            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                status: 'APPROVED'
            }));

            expect(mockAdd).not.toHaveBeenCalledWith(expect.objectContaining({
                type: 'SOLUTION_APPROVAL'
            }));
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app)
                .post('/v1/solutions')
                .send({ name: 'New Solution' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /v1/tickets', () => {
        it('should return tickets for authenticated user', async () => {
            // Setup Auth User (MockGet call 1)
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', email: 'user@example.com', role: 'REGULAR' });

            // Chain mockGet: 1. User Doc, 2. Tickets query result
            mockGet
                .mockResolvedValueOnce({ exists: true, data: () => ({ role: 'REGULAR' }) }) // Auth
                .mockResolvedValueOnce({ // Ticket Query
                    docs: [
                        { id: 't1', data: () => ({ title: 'Fix Bug', status: 'NEW' }) }
                    ]
                });

            const res = await request(app)
                .get('/v1/tickets')
                .set('Authorization', 'Bearer valid-token');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });
    });

    describe('PATCH /v1/tickets/:id/status', () => {
        it('should approve solution when ticket is RESOLVED', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'support123', role: 'ICP_SUPPORT' });

            // Chain mockGet: 1. User Doc (Auth), 2. Ticket Doc (Route)
            mockGet
                .mockResolvedValueOnce({ exists: true, data: () => ({ role: 'ICP_SUPPORT' }) }) // Auth
                .mockResolvedValueOnce({ // Ticket Doc
                    exists: true,
                    data: () => ({
                        type: 'SOLUTION_APPROVAL',
                        solutionId: 'sol-123',
                        status: 'NEW'
                    })
                });

            const res = await request(app)
                .patch('/v1/tickets/t1/status')
                .set('Authorization', 'Bearer token')
                .send({
                    status: 'RESOLVED',
                    comment: 'Approved!'
                });

            expect(res.status).toBe(200);

            // Verify Solution Update
            expect(mockUpdate).toHaveBeenCalledWith({ status: 'APPROVED' });
        });
    });

    describe('POST /v1/auth/register', () => {
        it('should register a new user', async () => {
            // Mock Firestore Set (using update mock for now as per mocks.ts)
            // In mocks.ts: doc().set = mockUpdate

            const res = await request(app)
                .post('/v1/auth/register')
                .send({
                    uid: 'firebase-uid-123',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: { number: '1234567890' }
                });

            expect(res.status).toBe(201);
        });
    });

    describe('POST /v1/partners', () => {
        it('should force status to PROPOSED and create ticket for regular users', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });

            // Auth User
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ role: 'REGULAR' }) });

            mockAdd.mockResolvedValue({
                id: 'p1',
                get: jest.fn().mockResolvedValue({ data: () => ({}) })
            });

            await request(app)
                .post('/v1/partners')
                .set('Authorization', 'Bearer token')
                .send({
                    organizationName: 'My NGO',
                    entityType: 'NGO',
                    status: 'APPROVED' // Trying to sneak in APPROVED
                });

            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                status: 'PROPOSED'
            }));

            // Verify Ticket creation
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'PARTNER_APPROVAL',
                partnerId: 'p1'
            }));
        });
    });

    describe('PUT /v1/partners/:id', () => {
        it('should prevent regular users from updating status', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });

            mockGet
                .mockResolvedValueOnce({ exists: true, data: () => ({ role: 'REGULAR' }) }) // Auth
                .mockResolvedValueOnce({ // Partner Doc
                    exists: true,
                    data: () => ({ status: 'PROPOSED' })
                });

            const res = await request(app)
                .put('/v1/partners/p1')
                .set('Authorization', 'Bearer token')
                .send({
                    status: 'APPROVED'
                });

            expect(res.status).toBe(403);
        });

        it('should allow ADMIN to update status', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'admin123', role: 'ADMIN' });

            mockGet
                .mockResolvedValueOnce({ exists: true, data: () => ({ role: 'ADMIN' }) }) // Auth
                .mockResolvedValueOnce({ // Partner Doc
                    exists: true,
                    data: () => ({ status: 'PROPOSED' })
                });

            const res = await request(app)
                .put('/v1/partners/p1')
                .set('Authorization', 'Bearer token')
                .send({
                    status: 'APPROVED'
                });

            expect(res.status).toBe(200);
        });
    });
});
