import { NextResponse } from 'next/server';
import { MediaUploadError, uploadCmsImage } from '@/lib/media/imageUpload';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/x-icon', 'image/vnd.microsoft.icon']);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    const uploaded = await uploadCmsImage({
      file,
      folder: 'siteicon',
      localPublicDir: 'siteicon',
      allowedTypes: ALLOWED_TYPES,
    });

    // Local: basename for `/siteicon/{fileName}`. S3: full durable URL.
    return NextResponse.json({
      success: true,
      fileName: uploaded.storage === 's3' ? uploaded.filePath : uploaded.fileName,
      filePath: uploaded.filePath,
      storage: uploaded.storage,
    });
  } catch (error) {
    if (error instanceof MediaUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Siteicon upload error:', error);
    return NextResponse.json({ error: 'Error saving siteicon' }, { status: 500 });
  }
}
