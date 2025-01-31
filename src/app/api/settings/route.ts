// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import UserModel from '@/models/User';
import SettingsModel from '@/models/Settings';
import { handleSuccess } from '@/utils/successHandler';
import { handleError } from '@/utils/errorHandler';

export async function GET(req: NextRequest) {
  try {
    const user = await UserModel.findOne();
    if (!user) {
      return handleError('User not found', 'User not found');
    }

    const settings = await SettingsModel.findOne({ userId: user._id });

    const responseData = {
      data: {
        user: {
          siteTitle: user.siteTitle || 'My Website'
        },
        settings: settings ? {
          tagline: settings.tagline,
          siteIcon: settings.siteIcon,
          siteAddress: settings.siteAddress,
          adminEmail: settings.adminEmail,
          newUserRole: settings.newUserRole,
          language: settings.language,
          timeZone: settings.timeZone,
          dateFormat: settings.dateFormat,
          timeFormat: settings.timeFormat
        } : null
      },
      success: true,
      message: 'Settings fetched successfully'
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    return handleError(error, error.message || 'Error fetching settings');
  }
}

// POST function for updating settings and user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Request Body:', body);
    const { siteTitle, ...settingsData } = body; // Ensure siteTitle is included

    if (!siteTitle) {
      return handleError('Validation error', 'siteTitle is required');
    }

    const user = await UserModel.findOne();
    if (!user) {
      return handleError('User not found', 'User not found');
    }

    // Update user siteTitle
    user.siteTitle = siteTitle;
    await user.save();

    // Update or create settings
    let settings = await SettingsModel.findOne({ userId: user._id });
    if (settings) {
      // Update only the settings data (excluding siteTitle)
      Object.assign(settings, settingsData);
    } else {
      settings = new SettingsModel({
        userId: user._id,
        ...settingsData, // Only pass the settings data excluding siteTitle
      });
    }
    await settings.save();

    return handleSuccess(true, {
      user: { siteTitle: user.siteTitle },
      settings
    }, 'Settings updated successfully');
  } catch (error: any) {
    return handleError(error, error.message || 'Error updating settings');
  }
}
