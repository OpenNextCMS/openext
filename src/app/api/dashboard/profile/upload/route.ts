// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getUserDbConnection, getUserModel } from '@/utils/db'; // Import connection and model utilities

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const userId = formData.get('userId') as string; // Assume userId is sent in the form data

  if (!file || !userId) {
    return NextResponse.json({ success: false, message: 'File or userId missing' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Compress/resize the image to 400x400 and compress it as JPEG with quality of 80.
  const processedBuffer = await sharp(buffer)
    .resize({ width: 400, height: 400, fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();

  const fileName = `${Date.now()}-${file.name}`;
  const uploadDir = path.join(process.cwd(), 'public', 'upload');
  const savePath = path.join(uploadDir, fileName);

  // Ensure the upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fs.writeFileSync(savePath, processedBuffer);

  const relativePath = `/upload/${fileName}`;
  const fullPath = `http://localhost:3000${relativePath}`;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (backendUrl) {
    // If external backend URL exists, send the full path to the external backend API
    const externalApiUrl = `${backendUrl}/api/dashboard/profile/upload/${userId}`;
    try {
      const response = await fetch(externalApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePicturePath: fullPath }), // Send fullPath instead of relativePath
      });

      if (!response.ok) {
        throw new Error(`External API error: ${response.statusText}`);
      }

      const result = await response.json();
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error communicating with external backend:', error);
      return NextResponse.json({ success: false, message: 'External backend error' }, { status: 500 });
    }
  }

  // Default behavior if no external backend URL
  try {
    await getUserDbConnection();
    const User = getUserModel();
    await User.findByIdAndUpdate(userId, { profilePicturePath: fullPath });

    return NextResponse.json({ success: true, filePath: fullPath });
  } catch (error) {
    console.error('Error updating user profile picture:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}