// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { AuthService } from '@/modules/auth/authService';
import { getUserDbConnection, getUserModel } from '@/utils/db';
import { tokenCookieOptions } from '@/lib/api/token-cookie';

export async function POST(request: Request) {
  try {
    // Initialize database connection
    await getUserDbConnection();
    const UserModel = getUserModel();

    const { identifier, password: userPassword } = await request.json();

    if (!identifier || !userPassword) {
      return NextResponse.json({ error: 'Identifier and password are required' }, { status: 400 });
    }

    const result = await AuthService.login(identifier, userPassword, UserModel);

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    if (!result) {
      return NextResponse.json({ error: 'Login failed' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true }, { status: 200 });

    response.cookies.set('token', result.token || '', tokenCookieOptions(request));
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
