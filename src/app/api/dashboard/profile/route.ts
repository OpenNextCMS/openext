import { NextRequest, NextResponse } from 'next/server';
import { IUser } from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';
import { getUserDbConnection, getUserModel } from '@/utils/db';
import { AuthService } from '@/modules/auth/authService';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    interface DecodedToken {
      email: string;
      userId: string;
      [key: string]: unknown;
    }
    const decodedToken: DecodedToken = jwtDecode(token);
    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
    const userDb = await getUserDbConnection();
    if (!userDb) {
      return NextResponse.json(
        { success: false, message: 'Database connection error' },
        { status: 500 }
      );
    }
    const UserModel = userDb.model<IUser>('User');
    const response = await AuthService.getUserByEmail(email, UserModel);
    if (!response?.success) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: response.user });
  } catch {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    interface DecodedToken {
      email: string;
      userId: string;
      [key: string]: unknown;
    }
    const decodedToken: DecodedToken = jwtDecode(token);
    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
    await getUserDbConnection();
    const UserModel = getUserModel();
    const body = await req.json();
    const { username, email: newEmail, newPassword, ...profileData } = body;
    const originalUser = await UserModel.findById(decodedToken.userId).maxTimeMS(5000);
    if (!originalUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    if (newEmail !== originalUser.email) {
      const emailExists = await UserModel.findOne({
        email: newEmail,
        _id: { $ne: originalUser._id },
      }).maxTimeMS(5000);
      if (emailExists) {
        return NextResponse.json(
          { success: false, message: 'Email already in use' },
          { status: 400 }
        );
      }
    }
    if (username !== originalUser.username) {
      const usernameExists = await UserModel.findOne({
        username,
        _id: { $ne: originalUser._id },
      }).maxTimeMS(5000);
      if (usernameExists) {
        return NextResponse.json(
          { success: false, message: 'Username already in use' },
          { status: 400 }
        );
      }
    }
    originalUser.username = username;
    originalUser.email = newEmail;
    // Update profile fields directly on user
    Object.assign(originalUser, profileData);
    if (newPassword && newPassword.trim() !== '') {
      originalUser.password = await bcrypt.hash(newPassword, 10);
    }
    await originalUser.save();

    // NEW: Generate a refreshed token with updated email
    const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
    const newToken = jwt.sign(
      {
        userId: originalUser._id,
        email: originalUser.email,
        username: originalUser.username,
        role: originalUser.role,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({
      success: true,
      data: originalUser,
      message: 'Profile updated successfully',
    });

    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
    });

    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Error updating profile',
      },
      { status: 500 }
    );
  }
}
