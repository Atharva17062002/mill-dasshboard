import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserWithPermissions } from '@/lib/permissions';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

        if (error || !supabaseUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Fetch app user with permissions from Prisma
        const appUser = await getUserWithPermissions(supabaseUser.id);

        if (!appUser) {
            return NextResponse.json({ error: 'User record not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: appUser.id,
                name: appUser.name,
                email: appUser.email,
                mill: appUser.mill,
                role: appUser.role,
                createdBy: appUser.createdBy,
                screenPermissions: appUser.screenPermissions.map(sp => ({
                    screen: sp.screen,
                    canAccess: sp.canAccess,
                    canCreate: sp.canCreate,
                    canEdit: sp.canEdit,
                    canDelete: sp.canDelete,
                })),
                fieldPermissions: appUser.fieldPermissions.map(fp => ({
                    screen: fp.screen,
                    fieldName: fp.fieldName,
                    canView: fp.canView,
                    canEdit: fp.canEdit,
                })),
            },
            supabaseUser: {
                id: supabaseUser.id,
                email: supabaseUser.email,
            },
        });
    } catch (err) {
        console.error('Error in /api/auth/me:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
