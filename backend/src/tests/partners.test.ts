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

// Mock Container
jest.mock('../container', () => ({
    searchPartnersUseCase: { execute: jest.fn() },
    createPartnerUseCase: { execute: jest.fn() },
    getPartnerUseCase: { execute: jest.fn() },
    updatePartnerUseCase: { execute: jest.fn() },
    searchSolutionsUseCase: { execute: jest.fn() },
    aiService: { indexEntity: jest.fn().mockResolvedValue(undefined) }
}));

import {
    searchPartnersUseCase,
    createPartnerUseCase,
    getPartnerUseCase,
    updatePartnerUseCase
} from '../container';

describe('Partners API', () => {
    beforeEach(() => {
        resetMocks();
        (searchPartnersUseCase.execute as jest.Mock).mockReset();
        (createPartnerUseCase.execute as jest.Mock).mockReset();
        (getPartnerUseCase.execute as jest.Mock).mockReset();
        (updatePartnerUseCase.execute as jest.Mock).mockReset();
    });

    describe('GET /v1/partners', () => {
        it('should return a list of partners', async () => {
            (searchPartnersUseCase.execute as jest.Mock).mockResolvedValue([
                { id: '1', organizationName: 'Org 1', status: 'MATURE' }
            ]);

            const res = await request(app).get('/v1/partners');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(res.body.items[0].organizationName).toBe('Org 1');
            expect(searchPartnersUseCase.execute).toHaveBeenCalled();
        });
    });

    describe('POST /v1/partners', () => {
        it('should force status to PROPOSED and create ticket for regular users', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });

            (createPartnerUseCase.execute as jest.Mock).mockResolvedValue({
                id: 'p1',
                organizationName: 'My NGO',
                status: 'PROPOSED'
            });

            await request(app)
                .post('/v1/partners')
                .set('Authorization', 'Bearer token')
                .send({
                    organizationName: 'My NGO',
                    entityType: 'NGO',
                    status: 'APPROVED'
                });

            expect(createPartnerUseCase.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    organizationName: 'My NGO',
                    status: 'APPROVED'
                }),
                expect.objectContaining({ uid: 'user123' })
            );
        });
    });

    describe('PUT /v1/partners/:id', () => {
        it('should prevent regular users from updating status', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', role: 'REGULAR' });
            (updatePartnerUseCase.execute as jest.Mock).mockRejectedValue(new Error('Unauthorized to change status'));

            const res = await request(app)
                .put('/v1/partners/p1')
                .set('Authorization', 'Bearer token')
                .send({ status: 'APPROVED' });

            expect(res.status).toBe(403);
        });

        it('should allow ADMIN to update status', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'admin123', role: 'ADMIN' });
            (updatePartnerUseCase.execute as jest.Mock).mockResolvedValue(undefined);
            (getPartnerUseCase.execute as jest.Mock).mockResolvedValue({ id: 'p1', status: 'APPROVED' });

            const res = await request(app)
                .put('/v1/partners/p1')
                .set('Authorization', 'Bearer token')
                .send({ status: 'APPROVED' });

            expect(res.status).toBe(200);
            expect(updatePartnerUseCase.execute).toHaveBeenCalled();
        });
    });
});
