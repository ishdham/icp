import request from 'supertest';
import app from '../app';
import { resetMocks, mockVerifyIdToken } from './mocks';

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

// Mock Container
jest.mock('../container', () => ({
    createSolutionUseCase: { execute: jest.fn() },
    searchSolutionsUseCase: { execute: jest.fn() },
    getSolutionUseCase: { execute: jest.fn() },
    updateSolutionUseCase: { execute: jest.fn() },
    // Add others to prevent crash if route imports them
    createPartnerUseCase: {},
    getPartnerUseCase: {},
    searchPartnersUseCase: {},
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
    aiService: {
        indexEntity: jest.fn().mockResolvedValue(undefined)
    }
}));

import {
    createSolutionUseCase,
    searchSolutionsUseCase,
    getSolutionUseCase,
    updateSolutionUseCase
} from '../container';

describe('Solutions API', () => {
    beforeEach(() => {
        resetMocks();
        (createSolutionUseCase.execute as jest.Mock).mockReset();
        (searchSolutionsUseCase.execute as jest.Mock).mockReset();
        (getSolutionUseCase.execute as jest.Mock).mockReset();
        (updateSolutionUseCase.execute as jest.Mock).mockReset();
    });

    describe('GET /v1/solutions', () => {
        it('should return solutions list', async () => {
            (searchSolutionsUseCase.execute as jest.Mock).mockResolvedValue([
                { id: '1', name: 'Sol 1', status: 'APPROVED' }
            ]);

            const res = await request(app).get('/v1/solutions');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(searchSolutionsUseCase.execute).toHaveBeenCalled();
        });
    });

    describe('POST /v1/solutions', () => {
        it('should create solution', async () => {
            const { authenticate } = require('../middleware/auth');
            authenticate.mockImplementation((req: any, res: any, next: any) => {
                req.user = { uid: 'user1', role: 'REGULAR' };
                next();
            });

            (createSolutionUseCase.execute as jest.Mock).mockResolvedValue({
                id: 'new-id',
                name: 'New Sol',
                status: 'PROPOSED'
            });

            const res = await request(app)
                .post('/v1/solutions')
                .set('Authorization', 'Bearer token')
                .send({
                    name: 'New Sol',
                    domain: 'Water',
                    status: 'DRAFT'
                });

            expect(res.status).toBe(201);
            expect(createSolutionUseCase.execute).toHaveBeenCalled();
        });
    });

    describe('GET /v1/solutions/:id', () => {
        it('should return solution', async () => {
            (getSolutionUseCase.execute as jest.Mock).mockResolvedValue({ id: '1', name: 'Sol 1' });

            const res = await request(app).get('/v1/solutions/1');

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('1');
        });
    });
});
