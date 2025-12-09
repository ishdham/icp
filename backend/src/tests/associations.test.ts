import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../app';
import { db, auth, resetMocks, mockGet, mockUpdate, mockVerifyIdToken, mockAdd, mockCollection, mockDoc } from './mocks';

// Mock the firebase config module
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

describe('Association Flow', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should create a partner as Admin', async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: 'admin_uid', role: 'ADMIN' });

        // Mock User Fetch for Auth
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'admin_uid',
            data: () => ({ role: 'ADMIN', firstName: 'Super', lastName: 'Admin' })
        });

        // Mock Add
        mockAdd.mockResolvedValueOnce({
            id: 'partner_123',
            get: jest.fn().mockResolvedValue({ data: () => ({ organizationName: 'Test NGO' }) })
        });

        const res = await request(app)
            .post('/v1/partners')
            .set('Authorization', 'Bearer admin_token')
            .send({
                organizationName: 'Test NGO',
                entityType: 'NGO',
                status: 'APPROVED'
            });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe('partner_123');
    });

    it('should request association as Regular User', async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: 'user_123', role: 'REGULAR' });

        // 1. Auth Use Fetch
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'user_123',
            data: () => ({ role: 'REGULAR', associatedPartners: [] })
        });

        // 2. Route Logic: partnerDoc.exists check
        //    db.collection('partners').doc(partnerId).get()
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ organizationName: 'Test NGO' })
        });

        // 3. Transaction: t.get(userRef) -> user existence check
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ associatedPartners: [] })
        });

        // 4. Transaction: t.get(userRef) -> second transaction block (read-modify-write)
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ associatedPartners: [] })
        });

        const res = await request(app)
            .post('/v1/users/user_123/associations')
            .set('Authorization', 'Bearer user_token')
            .send({ partnerId: 'partner_123' });

        expect(res.status).toBe(201);
        // Verify update was called with PENDING association
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                associatedPartners: expect.arrayContaining([
                    expect.objectContaining({ partnerId: 'partner_123', status: 'PENDING' })
                ])
            })
        );
    });

    it('should approve association as Admin', async () => {
        mockVerifyIdToken.mockResolvedValue({ uid: 'admin_uid', role: 'ADMIN' });

        // 1. Auth User Fetch
        mockGet.mockResolvedValueOnce({
            exists: true,
            id: 'admin_uid',
            data: () => ({ role: 'ADMIN' })
        });

        // 2. Transaction: t.get(userRef)
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                associatedPartners: [
                    { partnerId: 'partner_123', status: 'PENDING' }
                ]
            })
        });

        const res = await request(app)
            .put('/v1/users/user_123/associations/partner_123')
            .set('Authorization', 'Bearer admin_token')
            .send({ status: 'APPROVED' });

        expect(res.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                associatedPartners: expect.arrayContaining([
                    expect.objectContaining({ partnerId: 'partner_123', status: 'APPROVED' })
                ])
            })
        );
    });
});
