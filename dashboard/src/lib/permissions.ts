import { prisma } from '@/lib/prisma';

// All screens in the app
export const SCREENS = ['dashboard', 'records', 'settings', 'users'] as const;
export type Screen = (typeof SCREENS)[number];

// All editable fields in the Records (Lot) form
export const RECORD_FIELDS = [
    'Date',
    'Farmer Name',
    'Society',
    'Vehicle No',
    'TP ACCEPTED',
    'Token Qty ( Quintal )',
    'Gross(KG)',
    'Tare(KG)',
    'Total Packet',
    'Plastic Packet',
    'Quality Cuts',
    'Moisture Cuts',
] as const;
export type RecordField = (typeof RECORD_FIELDS)[number];

export type Action = 'access' | 'create' | 'edit' | 'delete';

export interface UserWithPermissions {
    id: string;
    name: string;
    email: string;
    mill: string | null;
    role: string;
    createdBy: string | null;
    createdAt: Date;
    screenPermissions: {
        id: number;
        userId: string;
        screen: string;
        canAccess: boolean;
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
    }[];
    fieldPermissions: {
        id: number;
        userId: string;
        screen: string;
        fieldName: string;
        canView: boolean;
        canEdit: boolean;
    }[];
}

/**
 * Check if a user can access a given screen.
 */
export function hasScreenAccess(user: UserWithPermissions, screen: Screen): boolean {
    // Service Provider has full access
    if (user.role === 'service_provider') return true;

    // Admin has access to everything except 'users' management is limited
    if (user.role === 'admin') return true;

    // Staff checks permissions
    const perm = user.screenPermissions.find(p => p.screen === screen);
    return perm?.canAccess ?? false;
}

/**
 * Check if user can perform an action (create/edit/delete) on a screen.
 */
export function canPerformAction(user: UserWithPermissions, screen: Screen, action: Action): boolean {
    if (user.role === 'service_provider') return true;

    if (user.role === 'admin') {
        // Admin can do everything except create service_providers (handled elsewhere)
        return true;
    }

    // Staff
    const perm = user.screenPermissions.find(p => p.screen === screen);
    if (!perm) return false;

    switch (action) {
        case 'access':
            return perm.canAccess;
        case 'create':
            return perm.canCreate;
        case 'edit':
            return perm.canEdit;
        case 'delete':
            return perm.canDelete;
        default:
            return false;
    }
}

/**
 * Check if user can edit a specific field on a screen.
 */
export function canEditField(user: UserWithPermissions, screen: Screen, fieldName: string): boolean {
    if (user.role === 'service_provider') return true;
    if (user.role === 'admin') return true;

    // Staff: check field permissions
    const perm = user.fieldPermissions.find(
        p => p.screen === screen && p.fieldName === fieldName
    );
    return perm?.canEdit ?? false;
}

/**
 * Check if user can view a specific field on a screen.
 */
export function canViewField(user: UserWithPermissions, screen: Screen, fieldName: string): boolean {
    if (user.role === 'service_provider') return true;
    if (user.role === 'admin') return true;

    const perm = user.fieldPermissions.find(
        p => p.screen === screen && p.fieldName === fieldName
    );
    return perm?.canView ?? true; // Default to visible
}

/**
 * Fetch user from Prisma with all permissions, given a Supabase Auth user ID.
 */
export async function getUserWithPermissions(authUserId: string): Promise<UserWithPermissions | null> {
    const user = await prisma.user.findUnique({
        where: { id: authUserId },
        include: {
            screenPermissions: true,
            fieldPermissions: true,
        },
    });
    return user;
}

/**
 * Generate default screen permissions for a role.
 */
export function getDefaultScreenPermissions(role: string): { screen: string; canAccess: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[] {
    if (role === 'service_provider') {
        return SCREENS.map(screen => ({
            screen,
            canAccess: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
        }));
    }

    if (role === 'admin') {
        return SCREENS.map(screen => ({
            screen,
            canAccess: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
        }));
    }

    // Staff: access only dashboard by default
    return SCREENS.map(screen => ({
        screen,
        canAccess: screen === 'dashboard',
        canCreate: false,
        canEdit: false,
        canDelete: false,
    }));
}

/**
 * Generate default field permissions for staff on the records screen.
 */
export function getDefaultFieldPermissions(role: string): { screen: string; fieldName: string; canView: boolean; canEdit: boolean }[] {
    if (role === 'service_provider' || role === 'admin') {
        return RECORD_FIELDS.map(field => ({
            screen: 'records',
            fieldName: field,
            canView: true,
            canEdit: true,
        }));
    }

    // Staff: view all, edit none by default
    return RECORD_FIELDS.map(field => ({
        screen: 'records',
        fieldName: field,
        canView: true,
        canEdit: false,
    }));
}
