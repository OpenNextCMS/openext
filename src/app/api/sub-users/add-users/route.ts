import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserDbConnection, getUserModel } from '../../../../utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { isAllowedRoleValue } from '@/lib/rbac/pluginUserTypes';

export async function POST(request: Request) {
  try {
    await requireCapability('users.manage');
    const { password, ...userData } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await getUserDbConnection();
    const User = getUserModel();

    const roleRaw = userData.role;
    const role =
      typeof roleRaw === 'number'
        ? roleRaw
        : typeof roleRaw === 'string' && roleRaw.trim()
          ? parseInt(roleRaw, 10)
          : 3;

    if (!Number.isFinite(role) || role < 0) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const allowed = await isAllowedRoleValue(role);
    if (!allowed) {
      return NextResponse.json({ error: 'Invalid or unregistered role' }, { status: 400 });
    }

    if (role === 0) {
      return NextResponse.json(
        { error: 'Cannot create SuperAdmin users from this screen' },
        { status: 403 }
      );
    }

    const active = userData.active === false || userData.active === 'false' ? false : true;

    const createdUser = await User.create({
      username: userData.username,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      role,
      active,
      password: hashedPassword,
      // Sub-users never run the SuperAdmin website setup wizard.
      onboardingCompleted: true,
    });

    const safeUser = createdUser.toObject();
    delete (safeUser as { password?: string }).password;

    return NextResponse.json({ message: 'User created', user: safeUser }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
