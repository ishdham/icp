import request from 'supertest';
import app from '../app';
import { resetMocks, mockGet, mockVerifyIdToken } from './mocks';

// Mock Firebase Config
jest.mock('../config/firebase', () => ({
    db: require('./mocks').db,
    auth: require('./mocks').auth,
    admin: {
        firestore: {
            FieldValue: {
                arrayUnion: jest.fn((val) => val)
            }
        },
        auth: () => require('./mocks').auth,
        credential: {
            cert: jest.fn()
        }
    }
}));

// Mock Middleware
jest.mock('../middleware/auth', () => ({
    authenticate: jest.fn((req, res, next) => next()),
    optionalAuthenticate: jest.fn((req, res, next) => next()),
    AuthRequest: {}
}));

// Mock Container (Empty mocks to satisfy imports)
jest.mock('../container', () => ({
    createSolutionUseCase: {},
    searchSolutionsUseCase: {},
    getSolutionUseCase: {},
    updateSolutionUseCase: {},
    createPartnerUseCase: {},
    getPartnerUseCase: {},
    searchPartnersUseCase: {},
    updatePartnerUseCase: {},
    createTicketUseCase: {},
    getTicketUseCase: {},
    listTicketsUseCase: {},
    updateTicketUseCase: {},
    resolveTicketUseCase: {},
    syncUserUseCase: {},
    getUserUseCase: {},
    updateUserUseCase: {},
    manageBookmarksUseCase: {},
    listUsersUseCase: {},
    manageAssociationsUseCase: {},
    aiService: {}
}));

describe('Stats API', () => {
    beforeEach(() => {
        resetMocks();
    });

    const mockAuthUser = (uid: string, role: string = 'REGULAR') => {
        const { optionalAuthenticate } = require('../middleware/auth');
        optionalAuthenticate.mockImplementation((req: any, res: any, next: any) => {
            req.user = { uid, role };
            next();
        });
    };

    const mockAnonymous = () => {
        const { optionalAuthenticate } = require('../middleware/auth');
        optionalAuthenticate.mockImplementation((req: any, res: any, next: any) => {
            req.user = undefined;
            next();
        });
    };

    describe('GET /v1/stats', () => {
        it('should return stats for anonymous user (Mature Only)', async () => {
            mockAnonymous();

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

        it('should return stats for Regular User', async () => {
            mockAuthUser('user1');

            // Sequence:
            // 1. Solutions Combined (Mature, My, Inter)
            // 2. Partners Combined (Mature, My, Inter)
            // 3. Tickets (Created, Assigned, Inter)

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

            const res = await request(app).get('/v1/stats');

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
            // 1. Solutions Global
            // 2. Partners Global
            // 3. Tickets Global

            mockGet
                .mockResolvedValueOnce({ data: () => ({ count: 200 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 100 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 50 }) });

            const res = await request(app).get('/v1/stats');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                solutions: 200,
                partners: 100,
                tickets: 50
            });
        });
    });
});
