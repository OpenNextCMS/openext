import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ message: 'Cookies cleared' });
  response.cookies.set('token', '', { expires: new Date(0) }); // Clear HTTP-only cookie
  return response;
}
