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

  // Ensure the upload directory exists
  const uploadDir = path.join(process.cwd(), 'public', 'upload');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `${Date.now()}-${file.name}`;
  const savePath = path.join(uploadDir, fileName);
  fs.writeFileSync(savePath, processedBuffer);

  const relativePath = `/upload/${fileName}`;
  const fullPath = `http://localhost:3000/${relativePath}`;

  try {
    // Get the user model
    await getUserDbConnection();
    const User = getUserModel();

    // Update the user's profilePicturePath in the database
    await User.findByIdAndUpdate(userId, { profilePicturePath: fullPath });

    return NextResponse.json({ success: true, filePath: fullPath });
  } catch (error) {
    console.error('Error updating user profile picture:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}