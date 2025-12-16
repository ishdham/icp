import { auth, db } from '../../config/firebase';
import { IAuthService, DecodedUser } from '../../domain/interfaces/auth.interface';

export class FirebaseAuthService implements IAuthService {
    async verifyToken(token: string): Promise<DecodedUser> {
        const decodedToken = await auth.verifyIdToken(token);
        const user = await this.getUser(decodedToken.uid);

        if (!user) {
            // If user not in DB yet, return minimal info from token
            return {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: 'REGULAR' // Default
            };
        }
        return user;
    }

    async setCustomUserClaims(uid: string, claims: object): Promise<void> {
        await auth.setCustomUserClaims(uid, claims);
    }

    async getUser(uid: string): Promise<DecodedUser | null> {
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return null;

        const data = doc.data();
        return {
            uid: doc.id,
            email: data?.email,
            role: data?.role || 'REGULAR',
            firstName: data?.firstName,
            lastName: data?.lastName,
            associatedPartners: data?.associatedPartners
        };
    }
}
