import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to get the path to our JSON database
function getDbPath() {
    return path.join(process.cwd(), 'src', 'data', 'database.json');
}

// Read records from the JSON file
function readRecords() {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
        return [];
    }
    const fileData = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(fileData);
}

// Write records to the JSON file
function writeRecords(records: any[]) {
    const dbPath = getDbPath();
    fs.writeFileSync(dbPath, JSON.stringify(records, null, 2), 'utf8');
}

// GET: Fetch all records
export async function GET() {
    try {
        const records = readRecords();
        return NextResponse.json(records);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read records' }, { status: 500 });
    }
}

// POST: Add a new record
export async function POST(request: Request) {
    try {
        const newRecord = await request.json();
        const records = readRecords();

        // Auto-increment Sl No and Excel si no
        const maxSlNo = records.reduce((max: number, r: any) => Math.max(max, r['Sl No'] || 0), 0);
        const newSlNo = maxSlNo + 1;

        const recordToAdd = {
            ...newRecord,
            'Sl No': newSlNo,
            'Excel si no': newSlNo,
            'Date': newRecord['Date'] || new Date().toISOString()
        };

        records.push(recordToAdd);
        writeRecords(records);

        return NextResponse.json({ success: true, record: recordToAdd }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add record' }, { status: 500 });
    }
}

// PUT: Update an existing record
export async function PUT(request: Request) {
    try {
        const updatedRecord = await request.json();
        const records = readRecords();

        const index = records.findIndex((r: any) => r['Sl No'] === updatedRecord['Sl No']);

        if (index === -1) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // Merge updates while preserving the Sl No and Excel si no
        records[index] = {
            ...records[index],
            ...updatedRecord,
            'Sl No': records[index]['Sl No'],
            'Excel si no': records[index]['Excel si no']
        };

        writeRecords(records);

        return NextResponse.json({ success: true, record: records[index] });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
    }
}

// DELETE: Remove a record
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slNoParam = searchParams.get('id');

        if (!slNoParam) {
            return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
        }

        const slNo = parseInt(slNoParam, 10);
        const records = readRecords();

        const initialLength = records.length;
        const filteredRecords = records.filter((r: any) => r['Sl No'] !== slNo);

        if (filteredRecords.length === initialLength) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        writeRecords(filteredRecords);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
    }
}
