import { NextResponse } from 'next/server';

/**
 * Page translation is disabled for this deployment.
 * POST /api/pages/translate
 */
export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Page translation is not available.' },
    { status: 403 }
  );
}
