import request from 'supertest';
import app from '../app';
import { db, resetMocks, mockGet, mockVerifyIdToken } from './mocks';

// Mock the firebase config module
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

describe.skip('API Enrichment Verification', () => {
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
            // Anonymous request - Single Query (Approved/Mature)

            // Mock Solutions List
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: '1', data: () => ({ name: 'Solution 1', providerId: 'providerUser' }) }
                ],
            });

            // Mock User Fetch for Enrichment (Solution 1 -> providerUser)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ firstName: 'John', lastName: 'Doe' })
            });

            // No Auth Header
            const res = await request(app).get('/v1/solutions');

            expect(res.status).toBe(200);
            if (res.body.items && res.body.items.length > 0) {
                expect(res.body.items[0].providerName).toBe('John Doe');
            } else {
                throw new Error('No items returned');
            }
        });
    });

    describe('GET /v1/partners', () => {
        it('should enrich partners with proposedByUserName', async () => {
            // Anonymous request - Single Query

            // Mock Partners List
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'p1', data: () => ({ organizationName: 'Org 1', proposedByUserId: 'proposerUser' }) }
                ],
            });

            // Mock User Fetch for Enrichment
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ firstName: 'Alice', lastName: 'Smith' })
            });

            // No Auth Header
            const res = await request(app).get('/v1/partners');

            expect(res.status).toBe(200);
            if (res.body.items && res.body.items.length > 0) {
                expect(res.body.items[0].proposedByUserName).toBe('Alice Smith');
            } else {
                throw new Error('No items returned');
            }
        });
    });

    describe('GET /v1/tickets', () => {
        it('should enrich tickets with createdByUserName', async () => {
            mockAuthUser('user1', 'ADMIN');

            // Mock Tickets List (Call 2)
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 't1', data: () => ({ title: 'Ticket 1', createdByUserId: 'creatorUser' }) }
                ],
            });

            // Mock User Fetch for Enrichment (Call 3)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ firstName: 'Bob', lastName: 'Jones' })
            });

            const res = await request(app)
                .get('/v1/tickets')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            if (res.body.items && res.body.items.length > 0) {
                expect(res.body.items[0].createdByUserName).toBe('Bob Jones');
            } else {
                // If 401/Empty, validUser.data error might have happened
                throw new Error(`Failed to fetch items. Status: ${res.status}`);
            }
        });
    });

    describe('GET /v1/users/me/bookmarks', () => {
        it('should enrich bookmarks with solutionName', async () => {
            // Mock Auth User (Call 1)
            mockVerifyIdToken.mockResolvedValue({ uid: 'user1' });
            mockGet.mockResolvedValueOnce({
                exists: true,
                id: 'user1',
                data: () => ({ uid: 'user1', role: 'REGULAR' })
            });

            // Mock User Doc Refresh for Bookmarks (Call 2)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    bookmarks: [
                        { solutionId: 'sol1', bookmarkedAt: '2023-01-01' }
                    ]
                })
            });

            // Mock Solution Fetch (Call 3)
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ name: 'Cool Solution' })
            });

            const res = await request(app)
                .get('/v1/users/me/bookmarks')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            if (res.body.items && res.body.items.length > 0) {
                expect(res.body.items[0].solutionName).toBe('Cool Solution');
            } else {
                throw new Error(`No items returned. Body: ${JSON.stringify(res.body)}`);
            }
        });
    });
});
