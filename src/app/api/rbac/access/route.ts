import { apiOk, handleApiError } from '@/lib/api/response';
import { requireRbac } from '@/lib/rbac/guard';
import { canSeeNavSection, getCapabilitiesForRole, type NavSectionId } from '@/lib/rbac/capabilities';
import { getAllowedEditorComponents } from '@/lib/rbac/editorComponents';
import { listActivePluginOptions, getAllowedPluginIds } from '@/lib/rbac/pluginAccess';
import {
  findPluginUserTypeByValueSync,
  getRoleLabel,
  getEffectiveCoreRole,
  resolveRoleValue,
} from '@/lib/rbac/pluginUserTypes';
import { findCustomRoleByValueSync } from '@/lib/rbac/customRoleCache';
import { ROLE } from '@/lib/rbac/roles';

const NAV_SECTIONS: NavSectionId[] = [
  'dashboard',
  'blogs',
  'pages',
  'themes',
  'plugins',
  'ai-settings',
  'users',
  'settings',
  'analytics',
  'form-builder',
  'menu-redirect',
  'uploaded-plugins',
];

/** GET /api/rbac/access — current user's role, capabilities, and nav visibility. */
export async function GET() {
  try {
    const ctx = await requireRbac();
    const nav: Record<string, boolean> = {};
    for (const section of NAV_SECTIONS) {
      nav[section] = canSeeNavSection(ctx.role, section);
    }

    const resolvedRole = resolveRoleValue(ctx.role);
    const pluginType = findPluginUserTypeByValueSync(resolvedRole);
    const customRole = findCustomRoleByValueSync(resolvedRole);
    const activePluginIds = (await listActivePluginOptions()).map((p) => p.pluginId);

    const pluginAccessByPlugin: Record<
      string,
      {
        pages: Array<{ id: string; features: string[] | '*' }>;
        permissions?: string[];
      }
    > = {};

    if (pluginType) {
      pluginAccessByPlugin[pluginType.pluginId] = {
        pages: pluginType.pageAccess ?? [{ id: '*', features: '*' }],
        permissions: pluginType.permissions,
      };
    } else if (customRole?.pluginPageAccess?.length) {
      for (const entry of customRole.pluginPageAccess) {
        pluginAccessByPlugin[entry.pluginId] = {
          pages: entry.pages?.length ? entry.pages : [{ id: '*', features: '*' }],
          permissions: entry.permissions,
        };
      }
    }

    return apiOk({
      role: ctx.role,
      roleLabel: await getRoleLabel(ctx.role),
      capabilities: getCapabilitiesForRole(ctx.role),
      allowedEditorComponents: getAllowedEditorComponents(ctx.role),
      allowedPluginIds: getAllowedPluginIds(ctx.role, activePluginIds),
      nav,
      isAdmin: getEffectiveCoreRole(ctx.role) <= ROLE.ADMIN,
      pluginUserType: pluginType
        ? {
            pluginId: pluginType.pluginId,
            id: pluginType.id,
            name: pluginType.name,
            permissions: pluginType.permissions,
            pageAccess: pluginType.pageAccess ?? [{ id: '*', features: '*' }],
          }
        : null,
      pluginAccessByPlugin,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
