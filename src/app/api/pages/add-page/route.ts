// app/api/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import { PageDocument } from '@/types/index';
import { jwtDecode } from 'jwt-decode';
import { cookies } from 'next/headers';

interface CustomError extends Error {
  statusCode?: number;
}
interface DecodedToken {
  userId: string;
  email: string;
}
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const decodedToken = jwtDecode<DecodedToken>(token);
    const userId = decodedToken.userId;
    // 1. Get DB connection
    const pageDb = await getPageDbConnection();

    // 2. Get the Page model tied to this DB
    const Page = getPageModel(pageDb);

        // 3. Create a new Page
        const newPage: PageDocument = await Page.create({
            ...body,
            createdBy: userId,
            modifications: [
                {
                  modifiedBy: userId,
                  modifiedAt: new Date(), 
                },
              ],
        });

    return NextResponse.json({ success: true, data: newPage }, { status: 201 });
  } catch (error) {
    const err = error as CustomError;
    console.error('Error creating page:', err.message);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
