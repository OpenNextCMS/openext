import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { getUserDbConnection } from '@/utils/db';
import { IUser } from '@/models/User';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    interface DecodedToken {
      email: string;
      // add other properties if needed
    }

    const decodedToken = jwtDecode<DecodedToken>(token);
    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const userDb = await getUserDbConnection();
    if (!userDb) {
      throw new Error('Failed to connect to database');
    }

    const UserModel = userDb.model<IUser>('User');
    const userData = await UserModel.findOne({ email });

    if (userData) {
      const user = {
        _id: userData._id!.toString(),
        username: userData.username,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
      };
      return NextResponse.json({ user }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
