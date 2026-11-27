import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { requireCapability } from '@/lib/rbac';
import { deleteCustomRole, updateCustomRole } from '@/lib/rbac/customRoles';

type RouteContext = { params: Promise<{ value: string }> };

/** PATCH /api/custom-roles/[value] — update a custom role (default & plugin roles are read-only). */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCapability('users.manage');
    const { value: valueRaw } = await context.params;
    const value = parseInt(valueRaw, 10);
    if (!Number.isFinite(value)) {
      return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
    }

    const body = await request.json();
    const role = await updateCustomRole(value, {
      name: body.name,
      baseRole: body.baseRole,
      capabilities: body.capabilities,
      allowedComponents: body.allowedComponents,
      allowedPlugins: body.allowedPlugins,
      pluginPageAccess: body.pluginPageAccess,
    });
    return NextResponse.json({ message: 'Role updated', role });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return apiError({ message: error.message }, 400);
    }
    return handleApiError(error);
  }
}

/** DELETE /api/custom-roles/[value] — delete a custom role and reassign users to Author. */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireCapability('users.manage');
    const { value: valueRaw } = await context.params;
    const value = parseInt(valueRaw, 10);
    if (!Number.isFinite(value)) {
      return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
    }

    await deleteCustomRole(value);
    return NextResponse.json({ message: 'Role deleted' });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return apiError({ message: error.message }, 400);
    }
    return handleApiError(error);
  }
}
