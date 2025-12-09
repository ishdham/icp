import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';

export interface AuthRequest extends Request {
    user?: {
        uid: string;
        email?: string;
        role?: string;
        firstName?: string;
        lastName?: string;
        associatedPartners?: any[];
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await auth.verifyIdToken(token);
        const validUser = await db.collection('users').doc(decodedToken.uid).get();
        const userData = validUser.data();

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: userData?.role || 'REGULAR',
            firstName: userData?.firstName,
            lastName: userData?.lastName,
            associatedPartners: userData?.associatedPartners || [],
        };
        next();
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
