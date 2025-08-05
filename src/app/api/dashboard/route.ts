import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '@/modules/auth/authService';
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

    const userDb = await getUserDbConnection();
    if (!userDb) {
      throw new Error('Failed to connect to database');
    }

    const UserModel = userDb.model<IUser>('User');
    const response = await AuthService.getUserByEmail(email, UserModel);

    if (response?.success) {
      const user = {
        _id: (response.user as IUser)._id!.toString(),
        username: response.user.username,
        email: response.user.email,
        phoneNumber: response.user.phoneNumber,
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
