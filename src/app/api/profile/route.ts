import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserModel, { IUser } from '@/models/User';
import ProfileModel, { IProfile } from '@/models/Profile';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let decodedToken: any;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const email = decodedToken.email;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const profile = await ProfileModel.findOne({ userId: user._id });
    return NextResponse.json({ success: true, user, profile });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error fetching profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('POST request received');
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.log('No token found');
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let decodedToken: any;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      console.log('Invalid token');
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const email = decodedToken.email;
    console.log('Decoded token:', decodedToken);

    const user = await UserModel.findOne({ email });
    if (!user) {
      console.log('User not found');
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    console.log('Request body:', body);
    const { username, email: newEmail, newPassword, ...profileData } = body;

    // Update user details
    user.username = username;
    user.email = newEmail;
    if (newPassword) {
      user.password = await bcrypt.hash(newPassword, 10);
    }
    await user.save();
    console.log('User updated:', user);

    // Update or create profile
    let profile = await ProfileModel.findOne({ userId: user._id });
    if (profile) {
      Object.assign(profile, profileData);
    } else {
      profile = new ProfileModel({ userId: user._id, ...profileData });
    }
    await profile.save();
    console.log('Profile updated:', profile);

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.log('Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Error updating profile' }, { status: 500 });
  }
}
