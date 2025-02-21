import { NextResponse } from 'next/server';
import { mkdirSync } from 'fs';
import { join } from 'path';
import AdmZip from 'adm-zip';

export async function POST(request: Request) {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const zip = new AdmZip(buffer);
        // Use original file name without the .zip extension as the folder name
        const originalName = file.name.replace(/\.zip$/i, '');
        const extractDir = join(process.cwd(), 'src/app/themes', originalName);
        mkdirSync(extractDir, { recursive: true });
        zip.extractAllTo(extractDir, true);
        return NextResponse.json({ success: true, themeFolder: originalName });
    } catch (error) {
        console.error('Error extracting zip:', error);
        return NextResponse.json({ error: 'Error extracting zip file' }, { status: 500 });
    }
}
