import { NextResponse } from 'next/server';
import { getDynamicEnv } from '@/utils/dynamicEnv';

/**
 * Legacy sync endpoint — on the external API this reports local env connection flags.
 * nextcms UI no longer needs this after the backend split.
 */
export async function GET() {
  const env = getDynamicEnv();
  return NextResponse.json({
    success: true,
    isRegistration: env.isRegistration === 'true',
    dbConnection: env.dbConnection === 'true',
  });
}
