import { NextResponse } from 'next/server';
import databaseRecords from '@/data/database.json';
import fs from 'fs';
import path from 'path';

interface Record {
    [key: string]: number | string | null | undefined;
}

function safeNum(val: unknown): number {
    if (val === null || val === undefined || val === '') return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
}

function sumColumn(records: Record[], key: string): number {
    return records.reduce((sum, r) => {
        const val = safeNum(r[key]);
        return sum + val;
    }, 0);
}

function readSettings() {
    const DEFAULTS = { millRate: 2369, qualityRate: 1900, recoveryRate: 0.68, lotSize: 290 };
    try {
        const raw = fs.readFileSync(path.join(process.cwd(), 'src/data/settings.json'), 'utf-8');
        return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
        return DEFAULTS;
    }
}

export async function GET() {
    const records = databaseRecords as Record[];
    const settings = readSettings();

    // Replicate all 12 dashboard formulas
    const millQty = sumColumn(records, 'Mill Qty. (qunital)');
    const totalQualityCutting = sumColumn(records, 'Total quality cutting') / 100;
    const qualityCut = sumColumn(records, 'Quality cut') / 100;
    const moistureCut = sumColumn(records, 'Moisture cut') / 100;
    const gross = sumColumn(records, 'Gross(KG)');
    const tare = sumColumn(records, 'Tare(KG)');
    const netKg = sumColumn(records, 'NET (KG)');
    const netQuintal = (gross - tare) / 100;
    const gunny = sumColumn(records, 'Packet (KG) calculated') / 100;
    const totalPacket = sumColumn(records, 'Total Packet');
    const tpAccepted = sumColumn(records, 'TP ACCEPTED');

    // Rates from settings
    const millRate = settings.millRate;
    const qualityRate = settings.qualityRate;
    const recoveryRate = settings.recoveryRate;
    const lotSize = settings.lotSize;

    // Percentage = (totalQualityCutting / (millQty + totalQualityCutting)) * 100
    const percentage = (totalQualityCutting / (millQty + totalQualityCutting)) * 100;
    const qualityPct = (qualityCut / (millQty + totalQualityCutting)) * 100;
    const moisturePct = (moistureCut / (millQty + totalQualityCutting)) * 100;

    // Revenue calculations
    const millRevenue = millQty * millRate;
    const qualityDeductionRevenue = totalQualityCutting * qualityRate;
    const tpRevenue = tpAccepted * qualityRate;

    // Recovery (68%)
    const millRecovery = millQty * recoveryRate;
    const qualityRecovery = totalQualityCutting * recoveryRate;
    const tpRecovery = tpAccepted * recoveryRate;

    // Lots
    const millLots = millRecovery / lotSize;
    const qualityLots = qualityRecovery / lotSize;
    const tpLots = tpRecovery / lotSize;

    // Recent records for table (sanitize data)
    const recentRecords = records.map(r => ({
        slNo: safeNum(r['Sl No']),
        date: r['Date'] || '',
        society: r['Society'] || '',
        farmerName: r['Farmer Name'] || '',
        vehicleNo: r['Vehicle No'] || '',
        tpAccepted: safeNum(r['TP ACCEPTED']),
        tokenQty: safeNum(r['Token Qty ( Quintal )']),
        millQty: safeNum(r['Mill Qty. (qunital)']),
        balance: safeNum(r['Balance']),
        grossKg: safeNum(r['Gross(KG)']),
        tareKg: safeNum(r['Tare(KG)']),
        netKg: safeNum(r['NET (KG)']),
        totalPacket: safeNum(r['Total Packet']),
        qualityCut: safeNum(r['Quality cut']),
        moistureCut: safeNum(r['Moisture cut']),
        totalCutting: safeNum(r['Total quality cutting']),
        percentage: safeNum(r['percentage']),
        ppcName: r['PPC Name'] || '',
    }));

    return NextResponse.json({
        summary: {
            millQty: Math.round(millQty * 100) / 100,
            totalQualityCutting: Math.round(totalQualityCutting * 100) / 100,
            percentage: Math.round(percentage * 100) / 100,
            qualityCut: Math.round(qualityCut * 100) / 100,
            moistureCut: Math.round(moistureCut * 100) / 100,
            qualityPct: Math.round(qualityPct * 100) / 100,
            moisturePct: Math.round(moisturePct * 100) / 100,
            gross,
            tare,
            netKg,
            netQuintal: Math.round(netQuintal * 100) / 100,
            gunny: Math.round(gunny * 100) / 100,
            totalPacket,
            tpAccepted: Math.round(tpAccepted * 100) / 100,
        },
        revenue: {
            millRate,
            qualityRate,
            millRevenue: Math.round(millRevenue * 100) / 100,
            qualityDeductionRevenue: Math.round(qualityDeductionRevenue * 100) / 100,
            tpRevenue: Math.round(tpRevenue * 100) / 100,
            millRecovery: Math.round(millRecovery * 100) / 100,
            qualityRecovery: Math.round(qualityRecovery * 100) / 100,
            tpRecovery: Math.round(tpRecovery * 100) / 100,
            millLots: Math.round(millLots * 100) / 100,
            qualityLots: Math.round(qualityLots * 100) / 100,
            tpLots: Math.round(tpLots * 100) / 100,
            recoveryRate,
            lotSize,
        },
        records: recentRecords,
        totalRecords: records.length,
    });
}
