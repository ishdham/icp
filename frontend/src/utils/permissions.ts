
// Replicated from shared/permissions.ts because we can't import outside src
// In a real monorepo with proper tooling we would import from shared

export interface PermissionUser {
    uid: string;
    email: string;
    role?: 'ADMIN' | 'ICP_SUPPORT' | 'USER';
}

export const isModerator = (user: any): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN' || user.role === 'ICP_SUPPORT';
};

export const canEditSolution = (user: any, solution: any): boolean => {
    if (!user) return false;
    const userId = user.uid || user.id;
    return !!(user.role === 'ADMIN' || user.role === 'ICP_SUPPORT' || (userId && solution.providerId === userId));
};

export const canEditPartner = (user: any, partner: any): boolean => {
    if (!user) return false;
    const userId = user.uid || user.id;
    return !!(user.role === 'ADMIN' || user.role === 'ICP_SUPPORT' || (userId && partner.proposedByUserId === userId));
};

export const canEditTickets = (user: any): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN' || user.role === 'ICP_SUPPORT';
};

export const canSeeUsers = (user: any): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN';
};

export const canEditUsers = (user: any): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN';
};
