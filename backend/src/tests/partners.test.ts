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

describe('Partners API', () => {
    beforeEach(() => {
        resetMocks();
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
