import { normalizeRole } from '@/lib/rbac/roles';
import {
  findPluginUserTypeByValueSync,
  resolveRoleValue,
} from '@/lib/rbac/pluginUserTypes';
import { findCustomRoleByValueSync } from '@/lib/rbac/customRoleCache';
import {
  type Capability,
  type NavSectionId,
  getCoreCapabilitiesForRole,
  getCapabilitiesForCoreOrPluginBaseRole,
} from '@/lib/rbac/capabilityDefinitions';

export type { Capability, NavSectionId } from '@/lib/rbac/capabilityDefinitions';
export {
  ALL_CAPABILITIES,
  CAPABILITY_LABELS,
  CAPABILITY_GROUPS,
  getCoreCapabilitiesForRole,
  getMaxCapabilitiesForBaseRole,
  validateCapabilitiesSubset,
} from '@/lib/rbac/capabilityDefinitions';

export function getCapabilitiesForRole(role: number | string | undefined | null): Capability[] {
  const resolved = resolveRoleValue(role);

  const customRole = findCustomRoleByValueSync(resolved);
  if (customRole) {
    return [...customRole.capabilities];
  }

  const pluginType = findPluginUserTypeByValueSync(resolved);
  if (pluginType) {
    const caps = getCapabilitiesForCoreOrPluginBaseRole(pluginType.baseRole);
    if (pluginType.permissions.length > 0 && !caps.includes('plugins.use')) {
      caps.push('plugins.use');
    }
    return caps;
  }

  // Default roles 0–3 always use hardcoded capabilities (never overridden).
  const coreRole = normalizeRole(resolved);
  return getCoreCapabilitiesForRole(coreRole);
}

export function hasCapability(
  role: number | string | undefined | null,
  capability: Capability
): boolean {
  return getCapabilitiesForRole(role).includes(capability);
}

const NAV_SECTION_CAPS: Record<NavSectionId, Capability[]> = {
  dashboard: ['dashboard.view'],
  blogs: ['blogs.view.all', 'blogs.view.own'],
  pages: ['pages.view'],
  themes: ['themes.view', 'themes.manage'],
  plugins: ['plugins.view', 'plugins.manage'],
  'ai-settings': ['ai-settings.manage'],
  users: ['users.manage'],
  settings: ['settings.manage'],
  analytics: ['analytics.view'],
  'form-builder': ['components.form-builder', 'plugins.use'],
  'menu-redirect': ['components.menu-redirect', 'plugins.use'],
  'social-media': ['components.social-media', 'plugins.use'],
  'uploaded-plugins': ['components.uploaded-plugins', 'plugins.use'],
};

export function canSeeNavSection(
  role: number | string | undefined | null,
  section: NavSectionId
): boolean {
  const caps = getCapabilitiesForRole(role);
  const required = NAV_SECTION_CAPS[section];
  return required.some((cap) => caps.includes(cap));
}
