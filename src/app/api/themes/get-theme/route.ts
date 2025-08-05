import { NextResponse } from 'next/server';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';

export async function GET() {
  await getUserDbConnection();
  const SettingsModel = getSettingsModel();
  const settings = await SettingsModel.findOne({});
  const activeTheme = settings?.themes.find(
    (theme: { name: string; isActive: boolean }) => theme.isActive
  );
  const themeName = activeTheme ? activeTheme.name : 'openNextDefault';

  return NextResponse.json({ themeName });
}
