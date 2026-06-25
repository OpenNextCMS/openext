/**
 * @deprecated Legacy ZIP-upload theme installer. Superseded by the
 * configuration-driven Theme Builder (`/dashboard/themes`, `/api/themes`).
 * Left dormant for backward-compat; do not extend. Slated for removal once the
 * new builder is fully verified.
 */
import { NextResponse } from 'next/server';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';

export async function POST(request: Request) {
  try {
    const { folderName } = await request.json();
    console.log('folderName:', folderName);
    if (!folderName) {
      return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 });
    }

    await getUserDbConnection();
    const Settings = getSettingsModel();
    let settings = await Settings.findOne({});

    if (settings) {
      if (!settings.themes.some((theme) => theme.name === folderName)) {
        settings.themes.push({ name: folderName, isActive: false });
        await settings.save();
      }
    } else {
      settings = new Settings({ themes: [{ name: folderName, isActive: false }] });
      await settings.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving theme:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
