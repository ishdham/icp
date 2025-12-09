import request from 'supertest';
import app from '../app';
import { db, resetMocks, mockGet, mockVerifyIdToken } from './mocks';

// Mock the firebase config module
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

describe('API Enrichment Verification', () => {
    beforeEach(() => {
        resetMocks();
    });

    const mockAuthUser = (uid: string, role: string = 'REGULAR', firstName = 'Test', lastName = 'User') => {
        mockVerifyIdToken.mockResolvedValue({ uid, email: `${uid}@example.com`, role });
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ uid, role, firstName, lastName })
        });
    };

    describe('GET /v1/solutions', () => {
        it('should enrich solutions with providerName', async () => {
            // Mock Solutions List
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: '1', data: () => ({ name: 'Solution 1', providerId: 'user1' }) }
                ],
            });

            // Mock User Fetch for Enrichment (Solution 1 -> user1)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ firstName: 'John', lastName: 'Doe' })
            });

            const res = await request(app).get('/v1/solutions');

            expect(res.status).toBe(200);
            expect(res.body.items[0].providerName).toBe('John Doe');
        });
    });

    describe('GET /v1/partners', () => {
        it('should enrich partners with proposedByUserName', async () => {
            // Mock Partners List
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'p1', data: () => ({ organizationName: 'Org 1', proposedByUserId: 'user2' }) }
                ],
            });

            // Mock User Fetch for Enrichment
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ firstName: 'Alice', lastName: 'Smith' })
            });

            const res = await request(app).get('/v1/partners');

            expect(res.status).toBe(200);
            expect(res.body[0].proposedByUserName).toBe('Alice Smith');
        });
    });

    describe('GET /v1/tickets', () => {
        it('should enrich tickets with createdByUserName', async () => {
            mockAuthUser('user1', 'ADMIN');

            // Mock Tickets List
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 't1', data: () => ({ title: 'Ticket 1', createdByUserId: 'user3' }) }
                ],
            });

            // Mock User Fetch for Enrichment
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ firstName: 'Bob', lastName: 'Jones' })
            });

            const res = await request(app)
                .get('/v1/tickets')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body[0].createdByUserName).toBe('Bob Jones');
        });
    });

    describe('GET /v1/users/me/bookmarks', () => {
        it('should enrich bookmarks with solutionName', async () => {
            mockAuthUser('user1', 'REGULAR');

            // Mock User Doc (Auth check re-fetch inside route if any? No, middleware does one, route does another)
            // Middleware mock is handled by mockAuthUser (User Doc Mock 1)
            // Route fetches User Doc again to get bookmarks (User Doc Mock 2)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    bookmarks: [
                        { solutionId: 'sol1', bookmarkedAt: '2023-01-01' }
                    ]
                })
            });

            // Mock Solution Fetch
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ name: 'Cool Solution' })
            });

            const res = await request(app)
                .get('/v1/users/me/bookmarks')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body[0].solutionName).toBe('Cool Solution');
        });
    });
});
