import { NextRequest, NextResponse } from 'next/server';
import { IUser } from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';
import { getUserDbConnection, getUserModel } from '@/utils/db';
// import ProfileModel from '@/models/Profile';
import {AuthService} from '@/modules/auth/authService';
import { cookies } from 'next/headers';
// import User from '@/models/User';
// import Profile from '@/models/Profile';
import { getProfileModel } from '@/utils/db';


interface DecodedToken extends JwtPayload {
  userId: string;
}

export async function GET(req: Request) {
  try {
    // ✅ Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      console.error("❌ No token found in cookies");
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Decode token to get user email
    const decodedToken: any = jwtDecode(token);
    const email = decodedToken.email;
    
    if (!email) {
      console.error("❌ Token is missing email:", decodedToken);
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    // ✅ Get the database connection
    const userDb = await getUserDbConnection();
    if (!userDb) {
      console.error("❌ Failed to connect to database");
      return NextResponse.json({ success: false, message: 'Database connection error' }, { status: 500 });
    }

    // ✅ Get the User model and fetch the user
    const UserModel = userDb.model<IUser>('User');
    const response = await AuthService.getUserByEmail(email, UserModel);

    if (!response?.success) {
      console.error("❌ User not found in database:", email);
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const user = response.user;

    // ✅ Fetch profile based on user ID
    const ProfileModel = getProfileModel();
    const profile = await ProfileModel.findOne({ userId: user._id }).maxTimeMS(30000);

    return NextResponse.json({ success: true, data: { user, profile } });

  } catch (error) {
    console.error("❌ Server error in /api/profile:", error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // ✅ Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      console.error("❌ No token found in cookies");
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Decode token to get user email
    const decodedToken: any = jwtDecode(token);
    const email = decodedToken.email;

    if (!email) {
      console.error("❌ Token is missing email:", decodedToken);
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    await getUserDbConnection();
    const UserModel = getUserModel();
    const body = await req.json();
    const { username, email: newEmail, newPassword, ...profileData } = body;

    const originalUser = await UserModel.findById(decodedToken.userId).maxTimeMS(5000);
    if (!originalUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    if (newEmail !== originalUser.email) {
      const emailExists = await UserModel.findOne({ 
        email: newEmail, 
        _id: { $ne: originalUser._id }
      }).maxTimeMS(5000);
      
      if (emailExists) {
        return NextResponse.json({
          success: false,
          message: 'Email already in use'
        }, { status: 400 });
      }
    }

    if (username !== originalUser.username) {
      const usernameExists = await UserModel.findOne({ 
        username, 
        _id: { $ne: originalUser._id }
      }).maxTimeMS(5000);
      
      if (usernameExists) {
        return NextResponse.json({
          success: false,
          message: 'Username already in use'
        }, { status: 400 });
      }
    }

    originalUser.username = username;
    originalUser.email = newEmail;
    
    if (newPassword && newPassword.trim() !== '') {
      originalUser.password = await bcrypt.hash(newPassword, 10);
    }

    await originalUser.save();

    const ProfileModel = getProfileModel();

    let profile = await ProfileModel.findOne({ userId: originalUser._id }).maxTimeMS(5000);
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