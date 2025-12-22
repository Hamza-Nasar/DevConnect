import { Session } from "next-auth";

export const ROLES = {
    USER: "USER",
    MODERATOR: "MODERATOR",
    ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export function hasRole(session: Session | null, role: UserRole): boolean {
    if (!session?.user) return false;
    const userRole = (session.user as any).role || ROLES.USER;

    if (role === ROLES.ADMIN) {
        return userRole === ROLES.ADMIN;
    }

    if (role === ROLES.MODERATOR) {
        return userRole === ROLES.ADMIN || userRole === ROLES.MODERATOR;
    }

    return true; // All authenticated users have USER role
}

export function isAdmin(session: Session | null): boolean {
    return hasRole(session, ROLES.ADMIN);
}

export function isModerator(session: Session | null): boolean {
    return hasRole(session, ROLES.MODERATOR);
}

export function isOwner(session: Session | null, resourceOwnerId: string): boolean {
    if (!session?.user) return false;
    return session.user.id === resourceOwnerId;
}
