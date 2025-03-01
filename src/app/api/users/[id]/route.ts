import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection } from '@/utils/db';
import { IUser } from '@/models/User';

export async function PATCH(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const userId = await Promise.resolve(context.params.id);
        const body = await request.json();
        const { role, active } = body;

        // Get database connection
        const userDb = await getUserDbConnection();
        const UserModel = userDb.model<IUser>('User');

        // Find and update the user
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            {
                $set: {
                    ...(typeof role !== 'undefined' && { role }),
                    ...(typeof active !== 'undefined' && { active })
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'User updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
