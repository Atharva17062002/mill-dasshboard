import { createClient } from '@/lib/supabase/server';
import { getUserWithPermissions, type UserWithPermissions } from '@/lib/permissions';

/**
 * Validates the Supabase auth session and returns the app user with permissions.
 * Returns null if not authenticated or user record not found.
 */
export async function getAuthenticatedUser(): Promise<UserWithPermissions | null> {
    try {
        const supabase = await createClient();
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

        if (error || !supabaseUser) return null;

        return getUserWithPermissions(supabaseUser.id);
    } catch {
        return null;
    }
}
