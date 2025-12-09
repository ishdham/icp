export interface PermissionUser {
    uid?: string;
    id?: string;
    role?: string;
    email?: string | null;
    firstName?: string;
    lastName?: string;
    associatedPartners?: any[];
    [key: string]: any;
}
