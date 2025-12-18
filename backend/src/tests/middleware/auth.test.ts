import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { resetMocks, mockVerifyIdToken, mockGet } from '../mocks';

// Mock Config
jest.mock('../../config/firebase', () => ({
    auth: require('../mocks').auth,
    db: require('../mocks').db,
}));

describe('Auth Middleware', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        resetMocks();
        mockReq = {
            headers: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('authenticate', () => {
        it('should return 401 if no authorization header', async () => {
            await authenticate(mockReq as AuthRequest, mockRes as Response, next);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('No token') }));
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 if token is invalid', async () => {
            mockReq.headers = { authorization: 'Bearer invalid-token' };
            mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

            await authenticate(mockReq as AuthRequest, mockRes as Response, next);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid token') }));
        });

        it('should populate user and call next if token is valid', async () => {
            mockReq.headers = { authorization: 'Bearer valid-token' };
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123', email: 'test@example.com' });

            // Mock User lookup
            mockGet.mockResolvedValue({
                data: () => ({ role: 'ADMIN', firstName: 'Test', lastName: 'User' })
            });

            await authenticate(mockReq as AuthRequest, mockRes as Response, next);

            expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user?.uid).toBe('user123');
            expect(mockReq.user?.role).toBe('ADMIN');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('optionalAuthenticate', () => {
        it('should proceed as anonymous if no header', async () => {
            await optionalAuthenticate(mockReq as AuthRequest, mockRes as Response, next);
            expect(mockReq.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });

        it('should populate user if token is valid', async () => {
            mockReq.headers = { authorization: 'Bearer valid-token' };
            mockVerifyIdToken.mockResolvedValue({ uid: 'user123' });
            mockGet.mockResolvedValue({ data: () => ({ role: 'REGULAR' }) });

            await optionalAuthenticate(mockReq as AuthRequest, mockRes as Response, next);
            expect(mockReq.user?.uid).toBe('user123');
            expect(next).toHaveBeenCalled();
        });

        it('should proceed as anonymous if token is invalid (no error)', async () => {
            mockReq.headers = { authorization: 'Bearer invalid-token' };
            mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

            await optionalAuthenticate(mockReq as AuthRequest, mockRes as Response, next);
            expect(mockReq.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });
    });
});
