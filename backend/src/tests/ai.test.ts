import request from 'supertest';
import app from '../app';
import { resetMocks, mockVerifyIdToken } from './mocks';

// Mock the firebase config module needed for auth middleware
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

// Mock the AI service
jest.mock('../services/ai', () => ({
    generateContent: jest.fn()
}));

describe('ICP AI API', () => {
    beforeEach(() => {
        resetMocks();
        // Clear mock for generateContent
        require('../services/ai').generateContent.mockReset();
    });

    describe('POST /v1/ai/chat', () => {
        it('should return generated content', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123' });
            const mockGenerate = require('../services/ai').generateContent;
            mockGenerate.mockResolvedValue('Mocked AI response');

            const res = await request(app)
                .post('/v1/ai/chat')
                .set('Authorization', 'Bearer token')
                .send({ message: 'Hello' });

            expect(res.status).toBe(200);
            expect(res.body.response).toBe('Mocked AI response');
        });

        it('should return 400 for invalid input', async () => {
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123' });

            const res = await request(app)
                .post('/v1/ai/chat')
                .set('Authorization', 'Bearer token')
                .send({}); // Missing message

            expect(res.status).toBe(400);
        });
    });
});
