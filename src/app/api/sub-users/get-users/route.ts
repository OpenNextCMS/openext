import { NextResponse } from 'next/server';
import { getUserDbConnection, getUserModel } from '../../../../utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';

export async function GET() {
  try {
    await requireCapability('users.manage');
    await getUserDbConnection();
    const User = getUserModel();

    const users = await User.find().select('-password');

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
