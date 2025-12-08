import request from 'supertest';
import { db, auth } from './mocks';

// Mock the firebase config module before importing app
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

import app from '../app';

describe('ICP Schema API', () => {
    describe('GET /v1/schemas/:type', () => {
        it('should return user schema', async () => {
            const res = await request(app).get('/v1/schemas/user');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('schema');
            expect(res.body).toHaveProperty('uischema');
            // zod-to-json-schema returns a structure with definitions and a $ref at the root
            expect(res.body.schema).toHaveProperty('properties');
            expect(res.body.schema).toHaveProperty('type', 'object');
        });

        it('should return partner schema', async () => {
            const res = await request(app).get('/v1/schemas/partner');
            expect(res.status).toBe(200);
            expect(res.body.schema).toHaveProperty('properties');
        });

        it('should return solution schema', async () => {
            const res = await request(app).get('/v1/schemas/solution');
            expect(res.status).toBe(200);
        });

        it('should return ticket schema', async () => {
            const res = await request(app).get('/v1/schemas/ticket');
            expect(res.status).toBe(200);
        });

        it('should return 404 for unknown schema', async () => {
            const res = await request(app).get('/v1/schemas/unknown');
            expect(res.status).toBe(404);
        });
    });
});
