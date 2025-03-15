import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserDbConnection, getUserModel } from '../../../../utils/db';

export async function POST(request: Request) {
    try {
        const { password, _id, ...userData } = await request.json(); // Destructure password separately

        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Establish DB connection and get User model
        await getUserDbConnection();
        const User = getUserModel();

        // Create a new user with the hashed password
        const createdUser = await User.create({ ...userData, password: hashedPassword });

        return NextResponse.json({ message: 'User created', user: createdUser }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
    }
}
