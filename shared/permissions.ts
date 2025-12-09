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
    if (user.role === 'ADMIN' || user.role === 'ICP_SUPPORT') return true;

    // Provider can edit
    const userId = user.uid || user.id;
    if (userId && solution.providerId === userId) return true;

    // Associated partner can edit
    if (solution.partnerId && user.associatedPartners) {
        const association = user.associatedPartners.find((p: any) => p.partnerId === solution.partnerId);
        if (association && association.status === 'APPROVED') return true;
    }

    return false;
};

export const canEditPartner = (user: PermissionUser | null | undefined, partner: any): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN' || user.role === 'ICP_SUPPORT') return true;

    const userId = user.uid || user.id;
    if (userId && partner.proposedByUserId === userId) return true;

    // Associated partner can edit
    const partnerId = partner.id || partner.objectID; // Handle Algolia objects if needed
    if (partnerId && user.associatedPartners) {
        const association = user.associatedPartners.find((p: any) => p.partnerId === partnerId);
        if (association && association.status === 'APPROVED') return true;
    }

    return false;
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
