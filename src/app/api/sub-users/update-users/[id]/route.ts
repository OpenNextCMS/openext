import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection } from '@/utils/db';
import { IUser } from '@/models/User';

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
    try {
        const { id: userId } = await Promise.resolve(context.params); // ✅ Await params before using

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const { role, active } = await request.json();

        // Ensure at least one field is being updated
        if (role === undefined && active === undefined) {
            return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
        }

        // Get database connection
        const userDb = await getUserDbConnection();
        const UserModel = userDb.model<IUser>('User');

        // Find and update the user
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { $set: { ...(role !== undefined && { role }), ...(active !== undefined && { active }) } },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User updated successfully', user: updatedUser });

    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

