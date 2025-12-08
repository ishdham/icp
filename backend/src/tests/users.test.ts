import request from 'supertest';
import app from '../app';
import { db, auth, resetMocks, mockGet, mockUpdate, mockVerifyIdToken, mockWhere } from './mocks';

// Mock the firebase config module
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

describe('ICP User API', () => {
    beforeEach(() => {
        resetMocks();
    });

    describe('GET /v1/users/me', () => {
        it('should return own profile', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123' });
            mockGet.mockResolvedValue({
                exists: true,
                id: 'user123',
                data: () => ({ firstName: 'John', email: 'john@example.com' })
            });

            const res = await request(app)
                .get('/v1/users/me')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('John');
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app).get('/v1/users/me');
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /v1/users/me', () => {
        it('should update profile data', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123' });

            const res = await request(app)
                .put('/v1/users/me')
                .set('Authorization', 'Bearer token')
                .send({
                    firstName: 'Jane',
                    phone: { number: '9876543210' }
                });

            expect(res.status).toBe(200);
            expect(mockUpdate).toHaveBeenCalledWith({
                firstName: 'Jane',
                phone: { number: '9876543210' }
            });
        });
    });

    describe('GET /v1/users/:id', () => {
        it('should allow admin to view any user', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'admin123', role: 'ADMIN' });

            // First call for authenticate (admin user)
            // Second call for route handler (target user)
            mockGet
                .mockResolvedValueOnce({
                    exists: true,
                    id: 'admin123',
                    data: () => ({ role: 'ADMIN' })
                })
                .mockResolvedValueOnce({
                    exists: true,
                    id: 'other456',
                    data: () => ({ firstName: 'Other' })
                });

            const res = await request(app)
                .get('/v1/users/other456')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('Other');
        });

        it('should prevent regular user from viewing others', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });

            // Only used for authenticate
            mockGet.mockResolvedValue({
                exists: true,
                id: 'user123',
                data: () => ({ role: 'REGULAR' })
            });

            const res = await request(app)
                .get('/v1/users/other456')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(403);
        });
    });

    describe('GET /v1/users', () => {
        it('should list users for admin', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'admin123', role: 'ADMIN' });

            // First for authenticate, Second for query
            mockGet
                .mockResolvedValueOnce({
                    exists: true,
                    id: 'admin123',
                    data: () => ({ role: 'ADMIN' })
                })
                .mockResolvedValueOnce({
                    docs: [
                        { id: 'u1', data: () => ({ email: 'u1@example.com' }) },
                        { id: 'u2', data: () => ({ email: 'u2@example.com' }) }
                    ]
                });

            const res = await request(app)
                .get('/v1/users')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });

        it('should return 403 for non-admin', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });

            // Authenticate user
            mockGet.mockResolvedValue({
                exists: true,
                id: 'user123',
                data: () => ({ role: 'REGULAR' })
            });

            const res = await request(app)
                .get('/v1/users')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(403);
        });
    });

    describe('POST /v1/users/me/bookmarks', () => {
        it('should add bookmark', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123' });

            // For authenticate
            mockGet.mockResolvedValue({
                exists: true,
                id: 'user123',
                data: () => ({ role: 'REGULAR', bookmarks: [] })
            });

            const res = await request(app)
                .post('/v1/users/me/bookmarks')
                .set('Authorization', 'Bearer token')
                .send({ solutionId: 'sol-1' });

            expect(res.status).toBe(201);
            expect(mockUpdate).toHaveBeenCalled();
        });
    });
});
