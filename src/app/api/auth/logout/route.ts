import { NextResponse } from 'next/server';
import { clearTokenCookieOptions } from '@/lib/api/token-cookie';

export async function GET(request: Request) {
  const response = NextResponse.json({ message: 'Logged out' });

  response.cookies.set('token', '', clearTokenCookieOptions(request));

  return response;
}
