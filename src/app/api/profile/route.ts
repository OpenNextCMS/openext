import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import UserModel from '@/models/User';
import ProfileModel from '@/models/Profile';
import { handleSuccess } from '@/utils/successHandler';
import { handleError } from '@/utils/errorHandler';
import { getUserDbConnection, getUserModel } from '@/lib/db';


export async function GET(req: NextRequest) {
  try {
    await getUserDbConnection();
    const UserModel = getUserModel();
    const user = await UserModel.findOne();
    if (!user) {
      return handleError('User not found', 'User not found');
    }

    const profile = await ProfileModel.findOne({ userId: user._id });

    const responseData = {
      data: {
        user: {
          username: user.username,
          email: user.email
        },
        profile: profile ? {
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          nickname: profile.nickname || '',
          displayName: profile.displayName || '',
          website: profile.website || '',
          bio: profile.bio || ''
        } : null
      },
      success: true,
      message: 'Profile fetched successfully'
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    return handleError(error, error.message || 'Error fetching profile');
  }
}

export async function POST(req: NextRequest) {
  try {
    await getUserDbConnection();
    const UserModel = getUserModel();
    const body = await req.json();
    const { username, email, newPassword, ...profileData } = body;

    // First find the current user (using the original email from the session)
    const originalUser = await UserModel.findOne();
    if (!originalUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Check if the new email is already taken by another user
    if (email !== originalUser.email) {
      const emailExists = await UserModel.findOne({ 
        email, 
        _id: { $ne: originalUser._id }
      });
      
      if (emailExists) {
        return NextResponse.json({
          success: false,
          message: 'Email already in use'
        }, { status: 400 });
      }
    }

    // Check if the new username is already taken
    if (username !== originalUser.username) {
      const usernameExists = await UserModel.findOne({ 
        username, 
        _id: { $ne: originalUser._id }
      });
      
      if (usernameExists) {
        return NextResponse.json({
          success: false,
          message: 'Username already in use'
        }, { status: 400 });
      }
    }

    // Update user details
    originalUser.username = username;
    originalUser.email = email;
    
    if (newPassword && newPassword.trim() !== '') {
      originalUser.password = await bcrypt.hash(newPassword, 10);
    }

    await originalUser.save();

    // Update or create profile
    let profile = await ProfileModel.findOne({ userId: originalUser._id });
    if (profile) {
      Object.assign(profile, profileData);
    } else {
      profile = new ProfileModel({ 
        userId: originalUser._id,
        ...profileData
      });
    }
    await profile.save();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          username: originalUser.username,
          email: originalUser.email
        },
        profile
      },
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Error updating profile'
    }, { status: 500 });
  }
}