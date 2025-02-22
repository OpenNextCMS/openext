// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getUserModel, getSettingsModel } from '@/utils/db';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      console.error("❌ No token found in cookies");
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken: any = jwtDecode(token);
    const email = decodedToken.email;

    if (!email) {
      console.error("❌ Token is missing email:", decodedToken);
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const userDb = await getUserDbConnection();
    if (!userDb) {
      console.error("❌ Failed to connect to database");
      return NextResponse.json({ success: false, message: 'Database connection error' }, { status: 500 });
    }

    const UserModel = userDb.model('User');
    const user = await UserModel.findOne({ email }).exec();

    if (!user) {
      console.error("❌ User not found in database:", email);
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const SettingsModel = getSettingsModel();
    // Removed query filter on userId. Adjust criteria as needed.
    const settings = await SettingsModel.findOne().exec();

    return NextResponse.json({ success: true, data: { user, settings } });

  } catch (error) {
    console.error("❌ Server error in /api/settings:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      console.error("❌ No token found in cookies");
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken: any = jwtDecode(token);
    const email = decodedToken.email;

    if (!email) {
      console.error("❌ Token is missing email:", decodedToken);
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    await getUserDbConnection();
    const UserModel = getUserModel();
    const body = await req.json();
    const { siteTitle, activeTheme, ...settingsData } = body;

    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Remove updating siteTitle on user
    // Update settings document
    const SettingsModel = getSettingsModel();
    let settings = await SettingsModel.findOne().exec();
    if (settings) {
      Object.assign(settings, settingsData, { siteTitle });
      if (activeTheme !== undefined) {
        settings.themes = settings.themes.map(theme => ({
          ...theme,
          isActive: theme.name === activeTheme
        }));
      }
    } else {
      settings = new SettingsModel({ siteTitle, ...settingsData });
      if (activeTheme) {
        settings.themes = settings.themes.map(theme => ({
          ...theme,
          isActive: theme.name === activeTheme
        }));
      }
    }
    await settings.save();

    return NextResponse.json({ success: true, data: { user, settings }, message: 'Settings updated successfully' });

  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Error updating settings' }, { status: 500 });
  }
}
