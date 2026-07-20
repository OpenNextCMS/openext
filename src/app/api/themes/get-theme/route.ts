import { NextResponse } from 'next/server';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';

// Always read the live active theme — never let the browser serve a stale
// cached theme name (which could point at an uninstalled theme folder).
export const dynamic = 'force-dynamic';

export async function GET() {
  await getUserDbConnection();
  const SettingsModel = getSettingsModel();
  const settings = await SettingsModel.findOne({});
  const activeTheme = settings?.themes.find(
    (theme: { name: string; isActive: boolean }) => theme.isActive
  );
  const themeName = activeTheme ? activeTheme.name : 'openNextDefault';

  return NextResponse.json({ themeName }, { headers: { 'Cache-Control': 'no-store' } });
}
