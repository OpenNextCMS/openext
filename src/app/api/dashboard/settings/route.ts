// app/api/dashboard/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getUserModel, getSettingsModel } from '@/utils/db';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

export async function GET() {
  try {
    const userDb = await getUserDbConnection();
    if (!userDb) {
      return NextResponse.json(
        { success: false, message: 'Database connection error' },
        { status: 500 }
      );
    }

    const SettingsModel = getSettingsModel();
    const settings = await SettingsModel.findOne({}).exec();

    // Check if user is authenticated (optional for GET)
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let isAuthenticated = false;

    if (token) {
      try {
        const decodedToken = jwtDecode<{ email?: string }>(token);
        if (decodedToken && decodedToken.email) {
          isAuthenticated = true;
        }
      } catch {
        console.warn('Invalid token found, treating as unauthenticated');
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: { settings },
      authenticated: isAuthenticated
    });
  } catch (error) {
    console.error('❌ Server error in /api/dashboard/settings:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      console.error('❌ No token found in cookies');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    interface DecodedToken {
      email: string;
      // Add other properties if needed
    }

    const decodedToken: DecodedToken = jwtDecode(token);
    const email = decodedToken.email;

    if (!email) {
      console.error('❌ Token is missing email:', decodedToken);
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    await getUserDbConnection();
    const UserModel = getUserModel();
    const body = await req.json();
    const { siteTitle, activeTheme, ...settingsData } = body;

    // If siteIcon exists, extract the filename in case a full path was sent.
    if (settingsData.siteIcon) {
      const parts = settingsData.siteIcon.split('/');
      settingsData.siteIcon = parts[parts.length - 1];
    }

    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const SettingsModel = getSettingsModel();
    // Removed userId filter – update the sole settings document
    let settings = await SettingsModel.findOne({}).exec();
    if (settings) {
      Object.assign(settings, settingsData, { siteTitle });
      if (activeTheme !== undefined) {
        settings.themes = settings.themes.map((theme) => ({
          ...theme,
          isActive: theme.name === activeTheme,
        }));
      }
      // Update maxFileSize in config if provided
      if (settingsData.config) {
        interface ConfigItem {
          key: string;
          value: string;
        }
        const maxFileSizeConfig = settingsData.config.find(
          (c: ConfigItem) => c.key === 'maxFileSize'
        );
        if (maxFileSizeConfig) {
          const existingConfig = settings.config.find((c) => c.key === 'maxFileSize');
          if (existingConfig) {
            existingConfig.value = maxFileSizeConfig.value;
          } else {
            settings.config.push(maxFileSizeConfig);
          }
        }
      }
    } else {
      settings = new SettingsModel({ siteTitle, ...settingsData });
      if (activeTheme) {
        settings.themes = settings.themes.map((theme) => ({
          ...theme,
          isActive: theme.name === activeTheme,
        }));
      }
      // Add default maxFileSize if not provided
      if (!settings.config.find((c) => c.key === 'maxFileSize')) {
        settings.config.push({ key: 'maxFileSize', value: '5mb' });
      }
    }
    await settings.save();

    return NextResponse.json({
      success: true,
      data: { settings },
      message: 'Settings updated successfully',
    });
  } catch (error: unknown) {
    console.error('Settings update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error updating settings';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
