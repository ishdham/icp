import type { PermissionUser } from './types';

export const isModerator = (user: PermissionUser | null | undefined): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN' || user.role === 'ICP_SUPPORT';
};

export const canSubmitSolution = (user: PermissionUser | null | undefined): boolean => {
    return !!user;
};

export const canSubmitPartner = (user: PermissionUser | null | undefined): boolean => {
    return !!user;
};

export const canEditSolution = (user: PermissionUser | null | undefined, solution: any): boolean => {
    if (!user) return false;
    const userId = user.uid || user.id;
    return !!(user.role === 'ADMIN' || user.role === 'ICP_SUPPORT' || (userId && solution.providerId === userId));
};

export const canEditPartner = (user: PermissionUser | null | undefined, partner: any): boolean => {
    if (!user) return false;
    const userId = user.uid || user.id;
    return !!(user.role === 'ADMIN' || user.role === 'ICP_SUPPORT' || (userId && partner.proposedByUserId === userId));
};

export const canSeeTickets = (user: PermissionUser | null | undefined): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN' || user.role === 'ICP_SUPPORT';
};

export const canEditTickets = (user: PermissionUser | null | undefined): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN' || user.role === 'ICP_SUPPORT';
};

export const canSeeUsers = (user: PermissionUser | null | undefined): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN';
};

export const canEditUsers = (user: PermissionUser | null | undefined): boolean => {
    if (!user) return false;
    return user.role === 'ADMIN';
};

// canApprove functions removed as per request to use canEdit instead

export const canApproveSolution = (user: PermissionUser | null | undefined): boolean => {
    return isModerator(user);
};

export const canApprovePartner = (user: PermissionUser | null | undefined): boolean => {
    return isModerator(user);
};
