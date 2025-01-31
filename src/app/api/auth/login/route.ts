// app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { AuthService } from '@/modules/auth/authService';
import User from '@/models/User';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export async function POST(request: Request) {
  try {
    // Get MongoDB connection string from environment variables
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    const host = process.env.MONGODB_HOST;
    const cluster = process.env.MONGODB_CLUSTER;
    const dbName = process.env.USER_DB_NAME || 'DB-USER';

    // Construct MongoDB URI
    const uri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${dbName}?retryWrites=true&w=majority`;

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri);
    }

    // Get request body
    const { identifier, password: userPassword } = await request.json();

    if (!identifier || !userPassword) {
      return NextResponse.json(
        { error: 'Identifier and password are required' },
        { status: 400 }
      );
    }

    // Attempt login using AuthService
    const result = await AuthService.login(identifier, userPassword, User);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Set JWT token in HTTP-only cookie
    const response = NextResponse.json(
      { success: true, user: result.user },
      { status: 200 }
    );

    response.cookies.set({
      name: 'token',
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 // 24 hours
    });

    return response;

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } 
}