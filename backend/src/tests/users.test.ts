import request from 'supertest';
import app from '../app';
import { db, auth, resetMocks, mockGet, mockVerifyIdToken } from './mocks';

// Mock the firebase config
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
    syncUserUseCase: { execute: jest.fn() },
    getUserUseCase: { execute: jest.fn() },
    updateUserUseCase: { execute: jest.fn() },
    manageBookmarksUseCase: {
        addBookmark: jest.fn(),
        removeBookmark: jest.fn()
    },
    listUsersUseCase: { execute: jest.fn() },
    manageAssociationsUseCase: {
        requestAssociation: jest.fn(),
        updateAssociationStatus: jest.fn()
    },
    // Other use cases
    createTicketUseCase: { execute: jest.fn() },
    getTicketUseCase: { execute: jest.fn() },
    listTicketsUseCase: { execute: jest.fn() },
    updateTicketUseCase: { execute: jest.fn() },
    resolveTicketUseCase: { execute: jest.fn() },
    searchPartnersUseCase: { execute: jest.fn() },
    createPartnerUseCase: { execute: jest.fn() },
    getPartnerUseCase: { execute: jest.fn() },
    updatePartnerUseCase: { execute: jest.fn() },
    searchSolutionsUseCase: { execute: jest.fn() },
    solutionsRepository: {},
    partnerRepository: {},
    ticketRepository: {},
    userRepository: {},
    aiService: { indexEntity: jest.fn().mockResolvedValue(undefined) }
}));

import {
    syncUserUseCase,
    getUserUseCase,
    updateUserUseCase,
    manageBookmarksUseCase,
    listUsersUseCase,
    manageAssociationsUseCase
} from '../container';

describe('Users API', () => {
    beforeEach(() => {
        resetMocks();
        (syncUserUseCase.execute as jest.Mock).mockReset();
        (getUserUseCase.execute as jest.Mock).mockReset();
        (updateUserUseCase.execute as jest.Mock).mockReset();
        (manageBookmarksUseCase.addBookmark as jest.Mock).mockReset();
        (manageBookmarksUseCase.removeBookmark as jest.Mock).mockReset();
        (listUsersUseCase.execute as jest.Mock).mockReset();
        (manageAssociationsUseCase.requestAssociation as jest.Mock).mockReset();
        (manageAssociationsUseCase.updateAssociationStatus as jest.Mock).mockReset();
    });

    describe('GET /v1/users/me', () => {
        it('should sync and return user', async () => {
            // Setup Auth Middleware Mock
            const { authenticate } = require('../middleware/auth');
            authenticate.mockImplementation((req: any, res: any, next: any) => {
                req.user = { uid: 'user123', email: 'test@example.com', role: 'REGULAR' };
                next();
            });

            (syncUserUseCase.execute as jest.Mock).mockResolvedValue({
                id: 'user123',
                email: 'test@example.com',
                role: 'REGULAR'
            });

            const res = await request(app)
                .get('/v1/users/me')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('user123');
            expect(syncUserUseCase.execute).toHaveBeenCalledWith('user123', 'test@example.com', expect.anything());
        });
    });

    describe('GET /v1/users/:id', () => {
        it('should return user for admin', async () => {
            const { authenticate } = require('../middleware/auth');
            authenticate.mockImplementation((req: any, res: any, next: any) => {
                req.user = { uid: 'admin123', role: 'ADMIN' };
                next();
            });

            (getUserUseCase.execute as jest.Mock).mockResolvedValue({ id: 'targetUser' });

            const res = await request(app)
                .get('/v1/users/targetUser')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('targetUser');
        });

        it('should deny regular user fetching other', async () => {
            const { authenticate } = require('../middleware/auth');
            authenticate.mockImplementation((req: any, res: any, next: any) => {
                req.user = { uid: 'user123', role: 'REGULAR' };
                next();
            });

            const res = await request(app)
                .get('/v1/users/otherUser')
                .set('Authorization', 'Bearer token');

            expect(res.status).toBe(403);
            expect(getUserUseCase.execute).not.toHaveBeenCalled();
        });
    });

    describe('POST /v1/users/me/bookmarks', () => {
        it('should add bookmark', async () => {
            const { authenticate } = require('../middleware/auth');
            authenticate.mockImplementation((req: any, res: any, next: any) => {
                req.user = { uid: 'user123', role: 'REGULAR' };
                next();
            });
            (manageBookmarksUseCase.addBookmark as jest.Mock).mockResolvedValue(undefined);

            const res = await request(app)
                .post('/v1/users/me/bookmarks')
                .set('Authorization', 'Bearer token')
                .send({ solutionId: 'sol1' });

            expect(res.status).toBe(201);
            expect(manageBookmarksUseCase.addBookmark).toHaveBeenCalledWith('user123', 'sol1');
        });
    });

    // Test Associations
    describe('POST /v1/users/:id/associations', () => {
        it('should request association', async () => {
            const { authenticate } = require('../middleware/auth');
            authenticate.mockImplementation((req: any, res: any, next: any) => {
                req.user = { uid: 'user123', role: 'REGULAR', firstName: 'Test' };
                next();
            });
            (manageAssociationsUseCase.requestAssociation as jest.Mock).mockResolvedValue(undefined);

            const res = await request(app)
                .post('/v1/users/user123/associations')
                .set('Authorization', 'Bearer token')
                .send({ partnerId: 'p1' });

            expect(res.status).toBe(201);
            expect(manageAssociationsUseCase.requestAssociation).toHaveBeenCalledWith('user123', 'p1', expect.anything());
        });
    });
});
