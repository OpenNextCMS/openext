import { NextResponse } from 'next/server';
import { getUserDbConnection } from '@/utils/db';

export async function GET() {
    try {
        const userDb = await getUserDbConnection();
        const RoleModel = userDb.models.Role;
        const roles = await RoleModel.find({});
        return NextResponse.json({ roles });
    } catch {
        return NextResponse.json({ error: "Unable to fetch roles" }, { status: 500 });
    }
}

