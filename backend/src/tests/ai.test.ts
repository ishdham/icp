import request from 'supertest';
import app from '../app';
import { resetMocks, mockVerifyIdToken } from './mocks';

// Mock the firebase config module needed for auth middleware
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
}));

// Mock the AI service
jest.mock('../services/ai.service', () => {
    return {
        aiService: {
            chatStream: jest.fn(),
            extractSolution: jest.fn(),
            initialize: jest.fn(), // If needed
        }
    };
});

describe('ICP AI API', () => {
    beforeEach(() => {
        resetMocks();
        // Clear mock for chatStream
        // We need to access the mock we created
        const { aiService } = require('../services/ai.service');
        (aiService.chatStream as jest.Mock).mockReset();
        (aiService.extractSolution as jest.Mock).mockReset();
    });

    const mockAuthUser = (uid: string) => {
        mockVerifyIdToken.mockResolvedValue({ uid, email: `${uid}@example.com`, role: 'REGULAR' });
        // Mock Firestore User for auth middleware
        require('./mocks').mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ uid, role: 'REGULAR' })
        });
    };

    describe('POST /v1/ai/chat', () => {
        it('should return generated content', async () => {
            mockAuthUser('user123');
            const { aiService } = require('../services/ai.service');

            // Mock chatStream to return simple stream or string-like behavior
            // Since route iterates over stream, we need an async generator or similar
            // Or we just mock it returning something that meets expectations?
            // Route expects `stream` which is iterable.

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield { text: 'Mocked ' };
                    yield { text: 'AI ' };
                    yield { text: 'response' };
                }
            };

            (aiService.chatStream as jest.Mock).mockResolvedValue(mockStream);

            const res = await request(app)
                .post('/v1/ai/chat')
                .set('Authorization', 'Bearer token')
                .send({ message: 'Hello' });

            expect(res.status).toBe(200);
            expect(res.status).toBe(200);
            // Route streams text, so supertest aggregates it in res.text
            expect(res.text).toBe('Mocked AI response');
        });

        it('should return 400 for invalid input', async () => {
            mockAuthUser('user123');

            const res = await request(app)
                .post('/v1/ai/chat')
                .set('Authorization', 'Bearer token')
                .send({}); // Missing message

            expect(res.status).toBe(400);
        });
    });

    describe('POST /v1/ai/extract', () => {
        it('should return extracted JSON', async () => {
            mockAuthUser('user123');
            const { aiService } = require('../services/ai.service');

            const mockData = {
                name: "Test Solution",
                summary: "A summary",
                detail: "Details",
                benefit: "Benefits",
                costAndEffort: "High",
                returnOnInvestment: "Good",
                domain: "Water",
                status: "PROPOSED"
            };

            (aiService.extractSolution as jest.Mock).mockResolvedValue(mockData);

            const res = await request(app)
                .post('/v1/ai/extract')
                .set('Authorization', 'Bearer token')
                .send({
                    history: [{ role: 'user', content: 'Here is a link' }],
                    prompt: 'Extract please'
                });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockData);
            expect(aiService.extractSolution).toHaveBeenCalledWith(
                [{ role: 'user', content: 'Here is a link' }],
                'Extract please'
            );
        });
    });
});
