import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULTS = {
    gunnyBagWeight: 0.7,
    plasticBagWeight: 0.3,
    millRate: 2369,
    qualityRate: 1900,
    recoveryRate: 0.68,
    lotSize: 290,
};

export async function GET() {
    try {
        const settings = await prisma.settings.findFirst();
        return NextResponse.json(settings ? { ...DEFAULTS, ...settings } : DEFAULTS);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json(DEFAULTS);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Upsert the settings row (assuming singleton with id = 1)
        const updated = await prisma.settings.upsert({
            where: { id: 1 },
            update: {
                gunnyBagWeight: body.gunnyBagWeight,
                plasticBagWeight: body.plasticBagWeight,
                millRate: body.millRate,
                qualityRate: body.qualityRate,
                recoveryRate: body.recoveryRate,
                lotSize: body.lotSize,
            },
            create: {
                id: 1,
                gunnyBagWeight: body.gunnyBagWeight ?? DEFAULTS.gunnyBagWeight,
                plasticBagWeight: body.plasticBagWeight ?? DEFAULTS.plasticBagWeight,
                millRate: body.millRate ?? DEFAULTS.millRate,
                qualityRate: body.qualityRate ?? DEFAULTS.qualityRate,
                recoveryRate: body.recoveryRate ?? DEFAULTS.recoveryRate,
                lotSize: body.lotSize ?? DEFAULTS.lotSize,
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to save settings:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
