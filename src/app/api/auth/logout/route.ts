import { NextResponse } from 'next/server';
import { getDynamicEnv } from '@/utils/dynamicEnv';

export async function GET() {
  const response = NextResponse.json({ message: 'Logged out' });

  // Correctly clear the token by setting an expired date
  response.cookies.set('token', '', {
    path: '/', // Ensure it's the same path used when setting the cookie
    httpOnly: true,
    secure: getDynamicEnv().NODE_ENV === 'production', // Only secure in production
    sameSite: 'strict',
    expires: new Date(0), // Immediately expire the cookie
  });

  return response;
}
