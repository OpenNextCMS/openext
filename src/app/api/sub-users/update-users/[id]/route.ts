import { NextRequest, NextResponse } from 'next/server';
import { getUserDbConnection, getUserModel } from '@/utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { isAllowedRoleValue } from '@/lib/rbac/pluginUserTypes';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PATCH /api/sub-users/update-users/[id] — update role, active status, contact fields. */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const ctx = await requireCapability('users.manage');
    const { id } = await context.params;
    const body = await req.json();

    await getUserDbConnection();
    const User = getUserModel();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect the primary SuperAdmin account from deactivation or role changes.
    if (user.role === 0) {
      return NextResponse.json(
        { error: 'SuperAdmin account cannot be modified from this screen' },
        { status: 403 }
      );
    }

    if (typeof body.email === 'string' && body.email.trim()) {
      const email = body.email.trim();
      const duplicate = await User.findOne({ email, _id: { $ne: id } });
      if (duplicate) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
      }
      user.email = email;
    }

    if (typeof body.phoneNumber === 'string') {
      user.phoneNumber = body.phoneNumber.trim();
    }

    if (body.role !== undefined && body.role !== null && body.role !== '') {
      const role = typeof body.role === 'number' ? body.role : parseInt(String(body.role), 10);
      if (!Number.isFinite(role) || role < 0) {
        return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
      }
      const allowed = await isAllowedRoleValue(role);
      if (!allowed) {
        return NextResponse.json({ error: 'Invalid or unregistered role' }, { status: 400 });
      }
      if (role === 0 && ctx.user.userId !== String(user._id)) {
        return NextResponse.json({ error: 'Cannot assign SuperAdmin role' }, { status: 403 });
      }
      user.role = role;
    }

    if (typeof body.active === 'boolean') {
      user.active = body.active;
    }

    await user.save();

    const safeUser = user.toObject();
    delete (safeUser as { password?: string }).password;

    return NextResponse.json({ message: 'User updated', user: safeUser }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
