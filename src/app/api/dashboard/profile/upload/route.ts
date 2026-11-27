import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getUserDbConnection, getUserModel } from '@/utils/db';
import { getDynamicEnv } from '@/utils/dynamicEnv';
import { MediaUploadError, uploadCmsImage } from '@/lib/media/imageUpload';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const userId = formData.get('userId') as string | null;

  if (!file || !userId) {
    return NextResponse.json(
      { success: false, message: 'File or userId missing' },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processedBuffer = await sharp(buffer)
      .resize({ width: 400, height: 400, fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const processedName = `${Date.now()}-${file.name.replace(/\.[^.]+$/, '') || 'profile'}.jpg`;

    const uploaded = await uploadCmsImage({
      file,
      folder: 'profile',
      localPublicDir: 'upload',
      buffer: processedBuffer,
      bufferContentType: 'image/jpeg',
      bufferFileName: processedName,
      allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']),
    });

    const fullPath =
      uploaded.storage === 's3'
        ? uploaded.filePath
        : `http://localhost:3000${uploaded.filePath}`;

    const backendUrl = getDynamicEnv().NEXT_PUBLIC_BACKEND_URL;

    if (backendUrl) {
      const externalApiUrl = `${backendUrl}/api/dashboard/profile/upload/${userId}`;
      try {
        const response = await fetch(externalApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profilePicturePath: fullPath }),
        });

        if (!response.ok) {
          throw new Error(`External API error: ${response.statusText}`);
        }

        const result = await response.json();
        return NextResponse.json(result);
      } catch (error) {
        console.error('Error communicating with external backend:', error);
        return NextResponse.json(
          { success: false, message: 'External backend error' },
          { status: 500 }
        );
      }
    }

    await getUserDbConnection();
    const User = getUserModel();
    await User.findByIdAndUpdate(userId, { profilePicturePath: fullPath });

    return NextResponse.json({
      success: true,
      filePath: fullPath,
      storage: uploaded.storage,
    });
  } catch (error) {
    if (error instanceof MediaUploadError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error('Error updating user profile picture:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
