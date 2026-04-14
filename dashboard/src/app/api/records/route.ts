import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { canPerformAction, canEditField } from '@/lib/permissions';

export async function getAllMappedLots() {
    const lots = await prisma.lot.findMany({
        include: { farmer: true, society: true, qualityCuts: true, moistureCuts: true },
        orderBy: { slNo: 'desc' }
    });

    const settings = await prisma.settings.findFirst();
    const gunnyWt = settings?.gunnyBagWeight ?? 0.7;
    const plasticWt = settings?.plasticBagWeight ?? 0.3;

    return lots.map((lot: any) => {
        const res: any = {
            'Sl No': lot.slNo,
            'Date': lot.entryDate.toISOString(),
            'Farmer Name': lot.farmer.name,
            'Society': lot.society.name,
            'Vehicle No': lot.vehicleNo,
            'TP ACCEPTED': lot.tpAccepted,
            'Token Qty ( Quintal )': lot.tokenQtyQuintal,
            'Total Packet': lot.totalPacket,
            'Plastic Packet': lot.plasticPacket,
            'Gross(KG)': lot.grossKg,
            'Tare(KG)': lot.tareKg,
        };

        let totalQCutKg = 0;
        let totalMCutKg = 0;

        const netKg = lot.grossKg - lot.tareKg;
        const gunnyCount = lot.totalPacket - lot.plasticPacket;
        const packetKgCalc = Math.round((gunnyCount * gunnyWt) + (lot.plasticPacket * plasticWt));

        const weightPerPacketIfAny = lot.totalPacket > 0 ? (lot.grossKg - lot.tareKg - packetKgCalc) / lot.totalPacket : 0;

        lot.qualityCuts.forEach((qc: any) => {
            res[`quality_count_${qc.rowIndex}`] = qc.packetCount;
            if (qc.mode === 'percent') {
                res[`quality_pct_${qc.rowIndex}`] = qc.qualityPct;
                totalQCutKg += Math.round((weightPerPacketIfAny * qc.packetCount) * (qc.qualityPct! / 100));
            } else {
                res[`quality_kgpkt_${qc.rowIndex}`] = qc.kgPerPkt;
                totalQCutKg += Math.round(qc.kgPerPkt! * qc.packetCount);
            }
        });

        lot.moistureCuts.forEach((mc: any) => {
            res[`moisture_count_${mc.rowIndex}`] = mc.packetCount;
            res[`moisture_pct_${mc.rowIndex}`] = mc.moisturePct;
            totalMCutKg += Math.round((weightPerPacketIfAny * mc.packetCount) * (mc.moisturePct! / 100));
        });

        const totalCuttingKg = totalQCutKg + totalMCutKg;
        const millQtyCalcKg = lot.grossKg - lot.tareKg - packetKgCalc - totalCuttingKg;

        res['NET (KG)'] = netKg;
        res['Mill Qty. (qunital)'] = millQtyCalcKg / 100;
        res['percentage'] = netKg > 0 ? (totalCuttingKg / netKg) * 100 : 0;

        return res;
    });
}

// GET: Fetch all records mapped to legacy JSON format
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const mapped = await getAllMappedLots();
        return NextResponse.json(mapped);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
    }
}

// Helpers for POST/PUT
const safeNum = (v: any) => v == null || v === '' ? 0 : Number(v);
const safeString = (v: any) => v == null || String(v).trim() === '' ? null : String(v).trim();

async function extractRelationsAndCuts(record: any) {
    const societyName = safeString(record['Society']) || 'Unknown Society';
    const society = await prisma.society.upsert({
        where: { name: societyName },
        create: { name: societyName },
        update: {}
    });

    const farmerName = safeString(record['Farmer Name']) || 'Unknown Farmer';
    let farmer = await prisma.farmer.findFirst({ where: { name: farmerName } });
    if (!farmer) {
        farmer = await prisma.farmer.create({ data: { name: farmerName } });
    }

    const qualityCuts = [];
    const moistureCuts = [];

    for (let i = 1; i <= 20; i++) {
        const count = safeNum(record[`quality_count_${i}`] ?? record[`moisture_count_${i}`]);
        const qPctRaw = record[`quality_pct_${i}`];
        const qKgRaw = record[`quality_kgpkt_${i}`];
        const mPctRaw = record[`moisture_pct_${i}`];

        let addedRow = false;

        if (count > 0) {
            if (qPctRaw !== undefined && String(qPctRaw) !== '') {
                qualityCuts.push({ rowIndex: i, mode: 'percent', packetCount: count, qualityPct: safeNum(qPctRaw) });
                addedRow = true;
            } else if (qKgRaw !== undefined && String(qKgRaw) !== '') {
                qualityCuts.push({ rowIndex: i, mode: 'kgpkt', packetCount: count, kgPerPkt: safeNum(qKgRaw) });
                addedRow = true;
            }

            if (mPctRaw !== undefined && String(mPctRaw) !== '') {
                moistureCuts.push({ rowIndex: i, packetCount: count, moisturePct: safeNum(mPctRaw) });
                addedRow = true;
            }
        }
    }

    return { farmerId: farmer.id, societyId: society.id, qualityCuts, moistureCuts };
}

// POST: Add a new record
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        if (!canPerformAction(user, 'records', 'create')) {
            return NextResponse.json({ error: 'Forbidden: no create permission' }, { status: 403 });
        }

        const newRecord = await request.json();

        const season = await prisma.season.findFirst({ where: { isActive: true } });
        const maxLot = await prisma.lot.findFirst({ orderBy: { slNo: 'desc' } });
        const newSlNo = (maxLot?.slNo || 0) + 1;

        const { farmerId, societyId, qualityCuts, moistureCuts } = await extractRelationsAndCuts(newRecord);

        const createdLot = await prisma.lot.create({
            data: {
                slNo: newSlNo,
                seasonId: season?.id || 1,
                entryDate: new Date(newRecord['Date'] || new Date()),
                farmerId,
                societyId,
                vehicleNo: safeString(newRecord['Vehicle No']) || 'UNKNOWN',
                tpAccepted: safeNum(newRecord['TP ACCEPTED']),
                tokenQtyQuintal: safeNum(newRecord['Token Qty ( Quintal )']),
                totalPacket: safeNum(newRecord['Total Packet']),
                plasticPacket: safeNum(newRecord['Plastic Packet']),
                grossKg: safeNum(newRecord['Gross(KG)']),
                tareKg: safeNum(newRecord['Tare(KG)']),
                qualityCuts: { create: qualityCuts },
                moistureCuts: { create: moistureCuts }
            }
        });

        return NextResponse.json({ success: true, record: { ...newRecord, 'Sl No': newSlNo } }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to add record' }, { status: 500 });
    }
}

// PUT: Update an existing record
export async function PUT(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        if (!canPerformAction(user, 'records', 'edit')) {
            return NextResponse.json({ error: 'Forbidden: no edit permission' }, { status: 403 });
        }

        const updatedRecord = await request.json();
        const slNo = updatedRecord['Sl No'];

        const existingLot = await prisma.lot.findUnique({
            where: { slNo },
            include: { farmer: true, society: true }
        });
        if (!existingLot) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

        // For staff users, merge only permitted fields with existing values
        let mergedRecord = updatedRecord;
        if (user.role === 'staff') {
            const fieldMap: Record<string, string> = {
                'Date': 'Date',
                'Farmer Name': 'Farmer Name',
                'Society': 'Society',
                'Vehicle No': 'Vehicle No',
                'TP ACCEPTED': 'TP ACCEPTED',
                'Token Qty ( Quintal )': 'Token Qty ( Quintal )',
                'Gross(KG)': 'Gross(KG)',
                'Tare(KG)': 'Tare(KG)',
                'Total Packet': 'Total Packet',
                'Plastic Packet': 'Plastic Packet',
            };

            // Get current mapped record to compare
            const currentMapped = (await getAllMappedLots()).find((r: any) => r['Sl No'] === slNo);
            if (currentMapped) {
                mergedRecord = { ...currentMapped, ...mergedRecord };
                // Revert fields the staff cannot edit
                for (const [fieldName, recordKey] of Object.entries(fieldMap)) {
                    if (!canEditField(user, 'records', fieldName)) {
                        mergedRecord[recordKey] = currentMapped[recordKey];
                    }
                }
                // Quality/Moisture cuts override check
                if (!canEditField(user, 'records', 'Quality Cuts')) {
                    // Keep existing quality cuts by not modifying quality_count/pct/kgpkt fields
                    for (let i = 1; i <= 20; i++) {
                        if (currentMapped[`quality_count_${i}`] !== undefined) mergedRecord[`quality_count_${i}`] = currentMapped[`quality_count_${i}`];
                        if (currentMapped[`quality_pct_${i}`] !== undefined) mergedRecord[`quality_pct_${i}`] = currentMapped[`quality_pct_${i}`];
                        if (currentMapped[`quality_kgpkt_${i}`] !== undefined) mergedRecord[`quality_kgpkt_${i}`] = currentMapped[`quality_kgpkt_${i}`];
                    }
                }
                if (!canEditField(user, 'records', 'Moisture Cuts')) {
                    for (let i = 1; i <= 20; i++) {
                        if (currentMapped[`moisture_count_${i}`] !== undefined) mergedRecord[`moisture_count_${i}`] = currentMapped[`moisture_count_${i}`];
                        if (currentMapped[`moisture_pct_${i}`] !== undefined) mergedRecord[`moisture_pct_${i}`] = currentMapped[`moisture_pct_${i}`];
                    }
                }
            }
        }

        const { farmerId, societyId, qualityCuts, moistureCuts } = await extractRelationsAndCuts(mergedRecord);

        // Delete old cuts
        await prisma.qualityCut.deleteMany({ where: { lotId: existingLot.id } });
        await prisma.moistureCut.deleteMany({ where: { lotId: existingLot.id } });

        // Update lot and insert new cuts
        await prisma.lot.update({
            where: { id: existingLot.id },
            data: {
                entryDate: new Date(mergedRecord['Date'] || new Date()),
                farmerId,
                societyId,
                vehicleNo: safeString(mergedRecord['Vehicle No']) || 'UNKNOWN',
                tpAccepted: safeNum(mergedRecord['TP ACCEPTED']),
                tokenQtyQuintal: safeNum(mergedRecord['Token Qty ( Quintal )']),
                totalPacket: safeNum(mergedRecord['Total Packet']),
                plasticPacket: safeNum(mergedRecord['Plastic Packet']),
                grossKg: safeNum(mergedRecord['Gross(KG)']),
                tareKg: safeNum(mergedRecord['Tare(KG)']),
                qualityCuts: { create: qualityCuts },
                moistureCuts: { create: moistureCuts }
            }
        });

        return NextResponse.json({ success: true, record: mergedRecord });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
    }
}

// DELETE: Remove a record
export async function DELETE(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        if (!canPerformAction(user, 'records', 'delete')) {
            return NextResponse.json({ error: 'Forbidden: no delete permission' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const slNoParam = searchParams.get('id');

        if (!slNoParam) return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });

        const slNo = parseInt(slNoParam, 10);
        await prisma.lot.delete({ where: { slNo } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
    }
}
