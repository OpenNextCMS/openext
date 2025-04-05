import { NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';

interface DecodedToken {
  userId: string;
  email: string;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const pageDb = await getPageDbConnection();
    const decodedToken = jwtDecode<DecodedToken>(token);
    console.log(decodedToken)
    const userId = decodedToken.userId;
    const PageModel = getPageModel(pageDb);

    const pages = await PageModel.find({}).lean().exec();
    console.log({ userId, pages })
    return NextResponse.json({ userId, pages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
