import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting migration from JSON to Supabase...');

    // --- 1. Settings ---
    const settingsPath = path.join(process.cwd(), 'src', 'data', 'settings.json');
    let settingsData = {
        gunnyBagWeight: 0.7,
        plasticBagWeight: 0.3,
        millRate: 2369,
        qualityRate: 1900,
        recoveryRate: 0.68,
        lotSize: 290
    };
    if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf8');
        if (raw) settingsData = JSON.parse(raw);
    }

    await prisma.settings.upsert({
        where: { id: 1 },
        update: settingsData,
        create: { id: 1, ...settingsData }
    });
    console.log('✅ Settings migrated.');

    // --- 2. Default Season ---
    const activeSeason = await prisma.season.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: 'Kharif 2024-25',
            type: 'kharif',
            startDate: new Date('2024-10-01'),
            endDate: new Date('2025-06-30'),
            isActive: true
        }
    });
    console.log('✅ Default season created.');

    // --- 3. Default Admin User for Adjustments ---
    await prisma.user.upsert({
        where: { email: 'admin@ricemill.com' },
        update: {},
        create: {
            name: 'System Admin',
            email: 'admin@ricemill.com',
            role: 'admin',
            mill: 'Main Mill'
        }
    });
    console.log('✅ Default admin user created.');

    // --- 4. Lots (Database) ---
    const dbPath = path.join(process.cwd(), 'src', 'data', 'database.json');
    if (!fs.existsSync(dbPath)) {
        console.log('No database.json found. Skipping lot migration.');
        return;
    }

    const records = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log(`Found ${records.length} records to migrate.`);

    for (const record of records) {
        if (!record['Sl No']) continue;

        // Society
        const societyName = record['Society'] ? record['Society'].toString().trim() : 'Unknown Society';
        const society = await prisma.society.upsert({
            where: { name: societyName },
            update: {},
            create: { name: societyName }
        });

        // Farmer
        const farmerName = record['Farmer Name'] ? record['Farmer Name'].toString().trim() : 'Unknown Farmer';
        let farmer = await prisma.farmer.findFirst({ where: { name: farmerName } });
        if (!farmer) {
            farmer = await prisma.farmer.create({
                data: {
                    name: farmerName,
                    tokenName: record['Token Name']?.toString(),
                    farmerCode: record['Farmer Code']?.toString(),
                    ppcName: record['PPC Name']?.toString(),
                    mobile: record['mobile']?.toString()
                }
            });
        }

        // Lot
        // Check if already exists to make script re-runnable
        const existingLot = await prisma.lot.findUnique({ where: { slNo: Number(record['Sl No']) } });
        if (existingLot) {
            console.log(`Skipping Sl No ${record['Sl No']} (already exists)`);
            continue;
        }

        const safeNum = (v: any) => v == null || v === '' ? 0 : Number(v);
        const safeString = (v: any) => v == null ? null : String(v);

        const dateStr = record['Date'] || new Date().toISOString();
        const dateObj = new Date(dateStr);

        const newLot = await prisma.lot.create({
            data: {
                slNo: Number(record['Sl No']),
                seasonId: activeSeason.id,
                entryDate: isNaN(dateObj.getTime()) ? new Date() : dateObj,
                farmerId: farmer.id,
                societyId: society.id,
                vehicleNo: safeString(record['Vehicle No']) || 'UNKNOWN',
                tpAccepted: safeNum(record['TP ACCEPTED']),
                tokenNo: safeString(record['Token No '] || record['Token No']),
                tokenQtyQuintal: safeNum(record['Token Qty ( Quintal )']),
                totalPacket: safeNum(record['Total Packet'] || record['Total packet']),
                plasticPacket: safeNum(record['Plastic packet'] || record['Plastic Packet']),
                grossKg: safeNum(record['Gross(KG)']),
                tareKg: safeNum(record['Tare(KG)']),
                gunnyAdv: safeNum(record['Gunny Adv.']),
                rejGunny: safeNum(record['Rej. Gunny']),
                qualityCuttingQuintal: safeNum(record['Quality cutting quintal'] || record['Quality cutting']),
                freightPaidDate: record['Frieght Paid Date'] ? new Date(record['Frieght Paid Date']) : null,
                freightPaid: safeNum(record['Frieght Paid']),
                comment: safeString(record['comment'])
            }
        });

        // Quality and Moisture Cuts
        const qualityCuts = [];
        const moistureCuts = [];

        // Legacy Excel keys mapping
        // We look for dynamic pattern or fixed 1-8 logic
        const getVal = (keys: string[]) => {
            for (const k of keys) {
                if (record[k] !== undefined && record[k] !== '') return Number(record[k]);
            }
            return null;
        };

        let dbRowIndex = 1;

        // Try dynamically assigned indices (1 to 10)
        for (let i = 1; i <= 10; i++) {
            const count = getVal([`No of Packet ${i}`, `quality_count_${i}`]) || 0;
            const qPct = getVal([`quality packet ${i} (Q)`, `quality by packet ${i}`, `quality_pct_${i}`]);
            const mPct = getVal([`MC packet ${i} (Q)`, `moisture_pct_${i}`]);
            const qKgPkt = getVal([`quality_kgpkt_${i}`]);

            let addedQuality = false;

            if (count > 0) {
                // Quality cut
                if (qPct !== null) {
                    qualityCuts.push({
                        lotId: newLot.id,
                        rowIndex: dbRowIndex,
                        mode: 'percent',
                        packetCount: count,
                        qualityPct: qPct
                    });
                    addedQuality = true;
                } else if (qKgPkt !== null) {
                    qualityCuts.push({
                        lotId: newLot.id,
                        rowIndex: dbRowIndex,
                        mode: 'kgpkt',
                        packetCount: count,
                        kgPerPkt: qKgPkt
                    });
                    addedQuality = true;
                }

                // Moisture cut
                if (mPct !== null) {
                    moistureCuts.push({
                        lotId: newLot.id,
                        rowIndex: dbRowIndex,
                        packetCount: count,
                        moisturePct: mPct
                    });
                }

                if (addedQuality || mPct !== null) {
                    dbRowIndex++;
                }
            }
        }

        if (qualityCuts.length > 0) await prisma.qualityCut.createMany({ data: qualityCuts });
        if (moistureCuts.length > 0) await prisma.moistureCut.createMany({ data: moistureCuts });

        console.log(`Migrated Sl No ${record['Sl No']} (Farmer: ${farmer.name})`);
    }

    console.log('🎉 Migration completed successfully!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
