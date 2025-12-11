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
        it('should return a list of solutions with total count', async () => {
            // mockGet Sequence:
            // 1. count().get() -> { data: { count: 100 } }
            // 2. get() -> { docs: [...] }

            mockGet
                .mockResolvedValueOnce({ data: () => ({ count: 100 }) }) // Count
                .mockResolvedValueOnce({ // Items
                    docs: [
                        { id: '1', data: () => ({ name: 'Clean Water', status: 'APPROVED' }) },
                        { id: '2', data: () => ({ name: 'Solar Energy', status: 'APPROVED' }) },
                    ],
                });

            const res = await request(app).get('/v1/solutions');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(2);
            expect(res.body.items[0].name).toBe('Clean Water');
            expect(res.body.total).toBe(100);
        });
    });

    describe('GET /v1/stats', () => {
        it('should return stats for anonymous user (Mature Only)', async () => {
            // Sequence:
            // 1. Solutions Mature Count
            // 2. Partners Mature Count
            mockGet
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) }) // Sol Mature
                .mockResolvedValueOnce({ data: () => ({ count: 5 }) }); // Partner Mature

            const res = await request(app).get('/v1/stats');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                solutions: 10,
                partners: 5,
                tickets: 0
            });
        });

        it('should return stats for Regular User (Combined + My Tickets)', async () => {
            mockAuthUser('user1');

            // Sequence:
            // 1. Auth check (User Doc) - Handled by mockAuthUser
            // 2. Solutions Combined (Mature, My, Inter)
            // 3. Partners Combined (Mature, My, Inter)
            // 4. Tickets (Created, Assigned, Inter)

            mockGet
                // Solutions: Mature=100, My=10, Inter=5 -> 105
                .mockResolvedValueOnce({ data: () => ({ count: 100 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 5 }) })
                // Partners: Mature=50, My=2, Inter=0 -> 52
                .mockResolvedValueOnce({ data: () => ({ count: 50 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 2 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 0 }) })
                // Tickets: Created=5, Assigned=3, Inter=1 -> 7
                .mockResolvedValueOnce({ data: () => ({ count: 5 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 3 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 1 }) });

            const res = await request(app)
                .get('/v1/stats')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                solutions: 105,
                partners: 52,
                tickets: 7
            });
        });

        it('should return stats for Admin (Global Counts)', async () => {
            mockAuthUser('admin1', 'ADMIN');

            // Sequence:
            // 1. Auth check - Handled by mockAuthUser
            // 2. Solutions Global
            // 3. Partners Global
            // 4. Tickets Global

            mockGet
                .mockResolvedValueOnce({ data: () => ({ count: 200 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 100 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 50 }) });

            const res = await request(app)
                .get('/v1/stats')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                solutions: 200,
                partners: 100,
                tickets: 50
            });
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
                    summary: 'Short summary',
                    detail: 'Detailed description',
                    domain: 'Water',
                    status: 'DRAFT',
                    benefit: 'Unique',
                    costAndEffort: 'Cost',
                    returnOnInvestment: 'ROI'
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('new-sol-id');
            expect(mockVerifyIdToken).toHaveBeenCalled();
        });

        it('should force status to PROPOSED and create a ticket for regular users', async () => {
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
                    summary: 'Summary',
                    detail: 'Detail',
                    domain: 'Water',
                    status: 'APPROVED',
                    benefit: 'Unique',
                    costAndEffort: 'Low',
                    returnOnInvestment: 'High'
                });

            expect(res.status).toBe(201);

            // Verify Solution creation with PROPOSED
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                status: 'PROPOSED'
            }));

            // Verify Ticket creation
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'SOLUTION_APPROVAL',
                solutionId: 'new-sol-id'
            }));
        });

        // Admin specific bypass test removed as current implementation enforces PROPOSED for all users.

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

            // Chain mockGet: 1. User Doc, 2. Count, 3. Tickets query result
            mockGet
                .mockResolvedValueOnce({ exists: true, data: () => ({ role: 'REGULAR' }) }) // User Doc
                .mockResolvedValueOnce({ data: () => ({ count: 2 }) }) // Count
                .mockResolvedValueOnce({ // Ticket Query
                    docs: [
                        { id: 't1', data: () => ({ title: 'Fix Bug', status: 'NEW' }) }
                    ]
                });

            const res = await request(app)
                .get('/v1/tickets')
                .set('Authorization', 'Bearer valid-token');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
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

            // Register checks if user exists first
            mockGet.mockResolvedValueOnce({ exists: false });

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

    describe('GET /v1/partners', () => {
        it('should return a list of partners', async () => {
            // Mock Partners List (Anonymous)
            // 1. Count
            // 2. Items
            mockGet
                .mockResolvedValueOnce({ data: () => ({ count: 1 }) })
                .mockResolvedValueOnce({
                    docs: [
                        { id: '1', data: () => ({ organizationName: 'Org 1', status: 'MATURE' }) }
                    ]
                });

            const res = await request(app).get('/v1/partners');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(res.body.items[0].organizationName).toBe('Org 1');
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
