import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get('file') as Blob;
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const extractedFolders = new Set<string>();
    const extractPath = path.join(process.cwd(), 'src/app/themes');

    // Step 1: Find the root folder name in the ZIP
    for (const filePath of Object.keys(zip.files)) {
      const parts = filePath.split('/');
      if (parts.length > 1) {
        extractedFolders.add(parts[0]); // Root folder name
      }
    }

    // Step 2: Get the theme name
    const folderName = extractedFolders.values().next().value;
    if (!folderName) {
      return NextResponse.json({ error: 'Invalid ZIP structure' }, { status: 400 });
    }

    const themePath = path.join(extractPath, folderName);

    // Step 3: Ensure theme directory exists
    await fs.mkdir(themePath, { recursive: true });

    // Step 4: Extract files into the theme folder
    for (const filePath of Object.keys(zip.files)) {
      const entry = zip.files[filePath];
      const fullPath = path.join(extractPath, filePath);
      const dir = path.dirname(fullPath);

      if (entry.dir) {
        // If it's a directory, just create it
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        // Ensure parent directory exists
        await fs.mkdir(dir, { recursive: true });
        const fileData = await entry.async('nodebuffer');
        await fs.writeFile(fullPath, fileData);
      }
    }

    return NextResponse.json({ folderName });
  } catch (error) {
    console.error('ZIP extraction error:', error);
    return NextResponse.json({ error: 'ZIP extraction error' }, { status: 500 });
  }
}
