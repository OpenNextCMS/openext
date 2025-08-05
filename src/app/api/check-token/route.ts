import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (token) {
    try {
      return NextResponse.json({ ok: true, token }, { status: 200 });
    } catch (error) {
      console.error('Error checking token:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
}
