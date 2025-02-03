// src/app/api/auth/admin/route.ts
import { NextRequest } from 'next/server';
import { AuthService } from '@/modules/auth/authService';
import { registerSchema } from '@/modules/auth/authValidation';
import { getUserDbConnection, getUserModel } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    // Initialize database connection
    await getUserDbConnection();
    const UserModel = getUserModel();

    const authData = await AuthService.register(validatedData, UserModel);

    if ('error' in authData) {
      return new Response(
        JSON.stringify({ success: false, message: authData.error, registration: 'failed' }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration successful',
        data: authData.user,
        isRegistration: 'successful'
      }),
      { status: 201 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Registration failed',
        isRegistration: 'failed'
      }),
      { status: 500 }
    );
  }
}