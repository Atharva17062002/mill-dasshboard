import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'src/data/settings.json');

const DEFAULTS = {
    gunnyBagWeight: 0.7,
    plasticBagWeight: 0.3,
    millRate: 2369,
    qualityRate: 1900,
    recoveryRate: 0.68,
    lotSize: 290,
};

function readSettings() {
    try {
        const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
        return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULTS };
    }
}

export async function GET() {
    return NextResponse.json(readSettings());
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const current = readSettings();
        const updated = { ...current, ...body };
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2) + '\n');
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
