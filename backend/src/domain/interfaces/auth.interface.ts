export interface DecodedUser {
    uid: string;
    email?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    associatedPartners?: any[];
}

export interface IAuthService {
    verifyToken(token: string): Promise<DecodedUser>;
    setCustomUserClaims(uid: string, claims: object): Promise<void>;
    getUser(uid: string): Promise<DecodedUser | null>;
}
