import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function getAllMappedLots() {
    const lots = await prisma.lot.findMany({
        include: { farmer: true, society: true, qualityCuts: true, moistureCuts: true },
        orderBy: { slNo: 'desc' }
    });

    const settings = await prisma.settings.findFirst();
    const gunnyWt = settings?.gunnyBagWeight ?? 0.7;
    const plasticWt = settings?.plasticBagWeight ?? 0.3;

    return lots.map(lot => {
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

        lot.qualityCuts.forEach(qc => {
            res[`quality_count_${qc.rowIndex}`] = qc.packetCount;
            if (qc.mode === 'percent') {
                res[`quality_pct_${qc.rowIndex}`] = qc.qualityPct;
                totalQCutKg += Math.round((weightPerPacketIfAny * qc.packetCount) * (qc.qualityPct! / 100));
            } else {
                res[`quality_kgpkt_${qc.rowIndex}`] = qc.kgPerPkt;
                totalQCutKg += Math.round(qc.kgPerPkt! * qc.packetCount);
            }
        });

        lot.moistureCuts.forEach(mc => {
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
        const updatedRecord = await request.json();
        const slNo = updatedRecord['Sl No'];

        const existingLot = await prisma.lot.findUnique({ where: { slNo } });
        if (!existingLot) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

        const { farmerId, societyId, qualityCuts, moistureCuts } = await extractRelationsAndCuts(updatedRecord);

        // Delete old cuts
        await prisma.qualityCut.deleteMany({ where: { lotId: existingLot.id } });
        await prisma.moistureCut.deleteMany({ where: { lotId: existingLot.id } });

        // Update lot and insert new cuts
        await prisma.lot.update({
            where: { id: existingLot.id },
            data: {
                entryDate: new Date(updatedRecord['Date'] || new Date()),
                farmerId,
                societyId,
                vehicleNo: safeString(updatedRecord['Vehicle No']) || 'UNKNOWN',
                tpAccepted: safeNum(updatedRecord['TP ACCEPTED']),
                tokenQtyQuintal: safeNum(updatedRecord['Token Qty ( Quintal )']),
                totalPacket: safeNum(updatedRecord['Total Packet']),
                plasticPacket: safeNum(updatedRecord['Plastic Packet']),
                grossKg: safeNum(updatedRecord['Gross(KG)']),
                tareKg: safeNum(updatedRecord['Tare(KG)']),
                qualityCuts: { create: qualityCuts },
                moistureCuts: { create: moistureCuts }
            }
        });

        return NextResponse.json({ success: true, record: updatedRecord });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
    }
}

// DELETE: Remove a record
export async function DELETE(request: Request) {
    try {
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
