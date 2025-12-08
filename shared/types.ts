export interface PermissionUser {
    uid?: string;
    id?: string;
    role?: string;
    email?: string | null;
    [key: string]: any;
}
