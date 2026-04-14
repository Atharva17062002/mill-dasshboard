import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { getUserWithPermissions, getDefaultScreenPermissions, getDefaultFieldPermissions } from '@/lib/permissions';

// Helper: get authenticated user or return error response
async function getAuthUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return getUserWithPermissions(user.id);
}

// GET: List all users
export async function GET() {
    try {
        const authUser = await getAuthUser();
        if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        if (authUser.role !== 'service_provider' && authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const whereClause = authUser.role === 'admin' 
            ? { role: { not: 'service_provider' } } 
            : {};

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                screenPermissions: true,
                fieldPermissions: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(users);
    } catch (err) {
        console.error('GET /api/users error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create a new user
export async function POST(request: Request) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        if (authUser.role !== 'service_provider' && authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, name, role, mill } = body;

        if (!email || !password || !name || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Admin can only create staff
        if (authUser.role === 'admin' && role !== 'staff') {
            return NextResponse.json({ error: 'Admins can only create staff users' }, { status: 403 });
        }

        // Only service_provider can create admin or service_provider
        if (role === 'service_provider' && authUser.role !== 'service_provider') {
            return NextResponse.json({ error: 'Only service providers can create service_provider users' }, { status: 403 });
        }

        // Create Supabase Auth user (no email confirmation)
        const adminClient = createAdminClient();
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // auto-confirm so user can login immediately
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const supabaseUserId = authData.user.id;

        // Create Prisma User record
        const screenPerms = getDefaultScreenPermissions(role);
        const fieldPerms = getDefaultFieldPermissions(role);

        const newUser = await prisma.user.create({
            data: {
                id: supabaseUserId,
                name,
                email,
                mill: mill || null,
                role,
                createdBy: authUser.id,
                screenPermissions: {
                    create: screenPerms,
                },
                fieldPermissions: {
                    create: fieldPerms,
                },
            },
            include: {
                screenPermissions: true,
                fieldPermissions: true,
            },
        });

        return NextResponse.json(newUser, { status: 201 });
    } catch (err) {
        console.error('POST /api/users error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Update a user (permissions, name, password, role)
export async function PUT(request: Request) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        if (authUser.role !== 'service_provider' && authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { id, name, role, mill, password, screenPermissions, fieldPermissions } = body;

        if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

        // Check target user exists
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Admin can only edit staff they created
        if (authUser.role === 'admin') {
            if (targetUser.role !== 'staff') {
                return NextResponse.json({ error: 'Admins can only edit staff users' }, { status: 403 });
            }
            if (targetUser.createdBy !== authUser.id) {
                return NextResponse.json({ error: 'You can only edit users you created' }, { status: 403 });
            }
        }

        // Update password in Supabase Auth if provided
        if (password) {
            const adminClient = createAdminClient();
            try {
                // Try by ID first (works when Prisma ID = Supabase UUID)
                const { error: pwError } = await adminClient.auth.admin.updateUserById(id, { password });
                if (pwError) {
                    // If ID is not a UUID, look up by email
                    const { data: listData } = await adminClient.auth.admin.listUsers();
                    const authMatch = listData?.users.find(u => u.email === targetUser.email);
                    if (authMatch) {
                        const { error: retryError } = await adminClient.auth.admin.updateUserById(authMatch.id, { password });
                        if (retryError) {
                            return NextResponse.json({ error: retryError.message }, { status: 400 });
                        }
                    } else {
                        return NextResponse.json({ error: 'No auth user found for this account' }, { status: 400 });
                    }
                }
            } catch {
                return NextResponse.json({ error: 'Failed to update password' }, { status: 400 });
            }
        }

        // Update Prisma User
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (mill !== undefined) updateData.mill = mill;

        await prisma.user.update({
            where: { id },
            data: updateData,
        });

        // Update screen permissions if provided
        if (screenPermissions && Array.isArray(screenPermissions)) {
            for (const sp of screenPermissions) {
                await prisma.screenPermission.upsert({
                    where: { userId_screen: { userId: id, screen: sp.screen } },
                    update: {
                        canAccess: sp.canAccess,
                        canCreate: sp.canCreate,
                        canEdit: sp.canEdit,
                        canDelete: sp.canDelete,
                    },
                    create: {
                        userId: id,
                        screen: sp.screen,
                        canAccess: sp.canAccess,
                        canCreate: sp.canCreate,
                        canEdit: sp.canEdit,
                        canDelete: sp.canDelete,
                    },
                });
            }
        }

        // Update field permissions if provided
        if (fieldPermissions && Array.isArray(fieldPermissions)) {
            for (const fp of fieldPermissions) {
                await prisma.fieldPermission.upsert({
                    where: {
                        userId_screen_fieldName: {
                            userId: id,
                            screen: fp.screen,
                            fieldName: fp.fieldName,
                        },
                    },
                    update: {
                        canView: fp.canView,
                        canEdit: fp.canEdit,
                    },
                    create: {
                        userId: id,
                        screen: fp.screen,
                        fieldName: fp.fieldName,
                        canView: fp.canView,
                        canEdit: fp.canEdit,
                    },
                });
            }
        }

        // Return updated user
        const updatedUser = await prisma.user.findUnique({
            where: { id },
            include: {
                screenPermissions: true,
                fieldPermissions: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error('PUT /api/users error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove a user
export async function DELETE(request: Request) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        if (authUser.role !== 'service_provider' && authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('id');
        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        // Can't delete yourself
        if (userId === authUser.id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Admin can only delete staff they created
        if (authUser.role === 'admin') {
            if (targetUser.role !== 'staff') {
                return NextResponse.json({ error: 'Admins can only delete staff users' }, { status: 403 });
            }
            if (targetUser.createdBy !== authUser.id) {
                return NextResponse.json({ error: 'You can only delete users you created' }, { status: 403 });
            }
        }

        // Delete from Supabase Auth (look up by email since ID might not be a UUID)
        const adminClient = createAdminClient();
        try {
            // First try deleting by ID (works for users created with our system)
            await adminClient.auth.admin.deleteUser(userId);
        } catch {
            // If that fails (e.g. CUID ID), try finding auth user by email
            const { data: listData } = await adminClient.auth.admin.listUsers();
            const authUserMatch = listData?.users.find(u => u.email === targetUser.email);
            if (authUserMatch) {
                await adminClient.auth.admin.deleteUser(authUserMatch.id);
            }
            // If no auth user found, that's OK — just delete from Prisma
        }

        // Delete from Prisma (cascade will handle permissions)
        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/users error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
