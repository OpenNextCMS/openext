import { NextResponse } from 'next/server';

/**
 * Site-wide page translation is disabled for this deployment.
 * POST /api/pages/translate-site
 */
export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Page translation is not available.' },
    { status: 403 }
  );
}
