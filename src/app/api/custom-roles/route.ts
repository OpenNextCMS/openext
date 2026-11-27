import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { requireCapability } from '@/lib/rbac';
import { createCustomRole,
  ensureCustomRolesCache,
  ensureSystemRolesMarked,
  listRolesForManagement,
} from '@/lib/rbac/customRoles';
import { cleanupOrphanedPluginRoles, ensurePluginUserTypesCache } from '@/lib/rbac/pluginUserTypes';

/** GET /api/custom-roles — list all roles with permissions metadata for management UI. */
export async function GET() {
  try {
    await requireCapability('users.manage');
    await ensureSystemRolesMarked();
    await ensurePluginUserTypesCache();
    await cleanupOrphanedPluginRoles();
    await ensureCustomRolesCache();
    const payload = await listRolesForManagement();
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return apiError({ message: error.message }, 400);
    }
    return handleApiError(error);
  }
}

/** POST /api/custom-roles — create a new custom role. */
export async function POST(request: Request) {
  try {
    await requireCapability('users.manage');
    const body = await request.json();
    const role = await createCustomRole({
      name: body.name,
      baseRole: body.baseRole,
      capabilities: body.capabilities,
      allowedComponents: body.allowedComponents,
      allowedPlugins: body.allowedPlugins,
      pluginPageAccess: body.pluginPageAccess,
    });
    return NextResponse.json({ message: 'Role created', role }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return apiError({ message: error.message }, 400);
    }
    return handleApiError(error);
  }
}
