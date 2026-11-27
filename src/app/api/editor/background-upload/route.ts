import { NextRequest, NextResponse } from 'next/server';
import { MediaUploadError, uploadCmsImage } from '@/lib/media/imageUpload';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'Image file is required' }, { status: 400 });
    }

    const uploaded = await uploadCmsImage({
      file,
      folder: 'backgrounds',
      localPublicDir: 'upload/backgrounds',
      allowedTypes: ALLOWED_TYPES,
    });

    return NextResponse.json({
      success: true,
      filePath: uploaded.filePath,
      storage: uploaded.storage,
    });
  } catch (error) {
    if (error instanceof MediaUploadError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error('Background upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload background image' },
      { status: 500 }
    );
  }
}
