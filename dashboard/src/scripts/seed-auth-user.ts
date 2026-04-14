/**
 * Seed script to create the initial Service Provider user.
 * Run with: npx tsx src/scripts/seed-auth-user.ts
 * 
 * Uses the Supabase Admin SDK to create the auth user
 * and Prisma to create the app record with full permissions.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load both .env and .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
    console.error('Missing DATABASE_URL or DIRECT_URL. Ensure .env.local is configured.');
    process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE env vars. Ensure .env.local is configured.');
    process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const SCREENS = ['dashboard', 'records', 'settings', 'users'];
const RECORD_FIELDS = [
    'Date', 'Farmer Name', 'Society', 'Vehicle No', 'TP ACCEPTED',
    'Token Qty ( Quintal )', 'Gross(KG)', 'Tare(KG)',
    'Total Packet', 'Plastic Packet', 'Quality Cuts', 'Moisture Cuts',
];

async function main() {
    const EMAIL = process.env.INITIAL_ADMIN_EMAIL;
    const PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;
    const NAME = 'Service Provider';

    if (!EMAIL || !PASSWORD) {
        console.error('Missing INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD in .env.local');
        process.exit(1);
    }

    console.log(`\n🌾 Creating Service Provider user...`);
    console.log(`   Email:    ${EMAIL}`);
    console.log(`   Password: [HIDDEN]\n`);

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
    });

    if (authError) {
        if (authError.message.includes('already been registered')) {
            console.log('⚠️  User already exists in Supabase Auth. Fetching existing user...');
            const { data: listData } = await adminClient.auth.admin.listUsers();
            const existing = listData?.users.find(u => u.email === EMAIL);
            if (!existing) {
                console.error('Could not find existing user');
                process.exit(1);
            }
            // Check if Prisma record exists
            const existingPrisma = await prisma.user.findUnique({ where: { id: existing.id } });
            if (existingPrisma) {
                console.log('✅ User already fully set up in both Supabase and database.');
                console.log(`\n   ID:    ${existingPrisma.id}`);
                console.log(`   Role:  ${existingPrisma.role}`);
                process.exit(0);
            }
            // Create Prisma record for existing Auth user
            await createPrismaUser(existing.id, NAME, EMAIL);
            process.exit(0);
        }
        console.error('Error creating auth user:', authError.message);
        process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✅ Auth user created: ${userId}`);

    // 2. Create Prisma user with full permissions
    await createPrismaUser(userId, NAME, EMAIL);
}

async function createPrismaUser(userId: string, name: string, email: string) {
    const screenPerms = SCREENS.map(screen => ({
        screen,
        canAccess: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
    }));

    const fieldPerms = RECORD_FIELDS.map(field => ({
        screen: 'records',
        fieldName: field,
        canView: true,
        canEdit: true,
    }));

    await prisma.user.create({
        data: {
            id: userId,
            name,
            email,
            role: 'service_provider',
            mill: null,
            createdBy: null,
            screenPermissions: { create: screenPerms },
            fieldPermissions: { create: fieldPerms },
        },
    });

    console.log(`✅ Database user created with full permissions.`);
    console.log(`\n🎉 Setup complete! You can now log in with:`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: [HIDDEN] (From environment file)\n`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
