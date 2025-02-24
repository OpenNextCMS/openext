import { NextResponse } from 'next/server';
import { getUserDbConnection, getUserModel } from '../../../utils/db';

export async function POST(request: Request) {
    try {
        // Parse request body
        const data = await request.json();

        // Establish DB connection and get User model
        await getUserDbConnection();
        const User = getUserModel();

        // Create a new user
        const createdUser = await User.create(data);

        return NextResponse.json({ message: 'User created', user: createdUser }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
    }
}
