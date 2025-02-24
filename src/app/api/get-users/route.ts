import { NextResponse } from 'next/server';
import { getUserDbConnection, getUserModel } from '../../../utils/db';

export async function GET(request: Request) {
    try {
        // Establish DB connection and get User model
        await getUserDbConnection();
        const User = getUserModel();

        // Query to retrieve all users
        const users = await User.find();

        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Error fetching users' }, { status: 500 });
    }
}
