import { NextResponse } from 'next/server';
import { getUserDbConnection } from '@/utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { ensureCustomRolesCache, ensureSystemRolesMarked } from '@/lib/rbac/customRoles';
import {
  cleanupOrphanedPluginRoles,
  ensurePluginUserTypesCache,
  getAllPluginUserTypes,
} from '@/lib/rbac/pluginUserTypes';

/**
 * GET /api/get-role — roles for the Users assign dropdown.
 * Includes default, custom, and plugin-registered roles (from api/roles.js).
 */
export async function GET() {
  try {
    await requireCapability('users.manage');
    await ensureSystemRolesMarked();
    await ensurePluginUserTypesCache();
    await cleanupOrphanedPluginRoles();
    await ensureCustomRolesCache();

    const userDb = await getUserDbConnection();
    const RoleModel = userDb.models.Role;
    const docs = (await RoleModel.find({}).sort({ value: 1 }).lean()) as unknown as Array<{
      name: string;
      value: number;
      type?: string;
      pluginId?: string;
      baseRole?: number;
    }>;

    const pluginTypes = await getAllPluginUserTypes();
    const pluginByValue = new Map(pluginTypes.map((entry) => [entry.value, entry]));

    const roles = docs.map((doc) => {
      const pluginType = pluginByValue.get(doc.value);
      const type =
        doc.type ||
        (pluginType ? 'plugin' : doc.value <= 3 ? 'system' : doc.value <= 99 ? 'custom' : 'plugin');

      return {
        name: doc.name,
        value: doc.value,
        type,
        pluginId: doc.pluginId || pluginType?.pluginId,
        baseRole: doc.baseRole ?? pluginType?.baseRole,
        permissions: pluginType?.permissions,
      };
    });

    return NextResponse.json({ roles });
  } catch (error) {
    return handleApiError(error);
  }
}
