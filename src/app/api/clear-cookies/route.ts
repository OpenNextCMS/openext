import { NextResponse } from 'next/server';
import { clearTokenCookieOptions } from '@/lib/api/token-cookie';

export async function POST(request: Request) {
  const response = NextResponse.json({ message: 'Cookies cleared' });
  response.cookies.set('token', '', clearTokenCookieOptions(request));
  return response;
}
