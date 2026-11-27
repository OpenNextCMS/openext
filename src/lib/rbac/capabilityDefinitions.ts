import { ROLE, ROLE_LABELS, type RoleValue } from '@/lib/rbac/roles';

/** Fine-grained capabilities used by core CMS routes and the dashboard UI. */
export type Capability =
  | 'dashboard.view'
  | 'pages.view'
  | 'pages.create'
  | 'pages.edit.all'
  | 'pages.edit.own'
  | 'pages.delete.all'
  | 'pages.delete.own'
  | 'blogs.view.all'
  | 'blogs.view.own'
  | 'blogs.create'
  | 'blogs.edit.all'
  | 'blogs.edit.own'
  | 'blogs.delete.all'
  | 'blogs.delete.own'
  | 'blogs.publish'
  | 'taxonomies.manage'
  | 'themes.view'
  | 'themes.manage'
  | 'plugins.view'
  | 'plugins.manage'
  | 'plugins.use'
  | 'settings.manage'
  | 'ai-settings.manage'
  | 'users.manage'
  | 'profile.edit'
  | 'analytics.view'
  | 'components.form-builder'
  | 'components.menu-redirect'
  | 'components.social-media'
  | 'components.uploaded-plugins';

export const ALL_CAPABILITIES: Capability[] = [
  'dashboard.view',
  'pages.view',
  'pages.create',
  'pages.edit.all',
  'pages.edit.own',
  'pages.delete.all',
  'pages.delete.own',
  'blogs.view.all',
  'blogs.view.own',
  'blogs.create',
  'blogs.edit.all',
  'blogs.edit.own',
  'blogs.delete.all',
  'blogs.delete.own',
  'blogs.publish',
  'taxonomies.manage',
  'themes.view',
  'themes.manage',
  'plugins.view',
  'plugins.manage',
  'plugins.use',
  'settings.manage',
  'ai-settings.manage',
  'users.manage',
  'profile.edit',
  'analytics.view',
  'components.form-builder',
  'components.menu-redirect',
  'components.social-media',
  'components.uploaded-plugins',
];

const ADMIN_CAPS: Capability[] = [...ALL_CAPABILITIES];

const EDITOR_CAPS: Capability[] = [
  'dashboard.view',
  'pages.view',
  'pages.create',
  'pages.edit.all',
  'pages.delete.all',
  'blogs.view.all',
  'blogs.create',
  'blogs.edit.all',
  'blogs.delete.all',
  'blogs.publish',
  'taxonomies.manage',
  'themes.view',
  'plugins.view',
  'plugins.use',
  'components.form-builder',
  'components.menu-redirect',
  'components.social-media',
  'components.uploaded-plugins',
  'profile.edit',
  'analytics.view',
];

const AUTHOR_CAPS: Capability[] = [
  'dashboard.view',
  'pages.view',
  'pages.create',
  'pages.edit.own',
  'pages.delete.own',
  'blogs.view.own',
  'blogs.create',
  'blogs.edit.own',
  'blogs.delete.own',
  'profile.edit',
];

const CAPS_BY_ROLE: Record<RoleValue, Capability[]> = {
  [ROLE.SUPER_ADMIN]: ADMIN_CAPS,
  [ROLE.ADMIN]: ADMIN_CAPS,
  [ROLE.EDITOR]: EDITOR_CAPS,
  [ROLE.AUTHOR]: AUTHOR_CAPS,
};

/** Human-readable labels for capability checkboxes in role management UI. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  'dashboard.view': 'View dashboard',
  'pages.view': 'View pages',
  'pages.create': 'Create pages',
  'pages.edit.all': 'Edit all pages',
  'pages.edit.own': 'Edit own pages',
  'pages.delete.all': 'Delete all pages',
  'pages.delete.own': 'Delete own pages',
  'blogs.view.all': 'View all blogs',
  'blogs.view.own': 'View own blogs',
  'blogs.create': 'Create blogs',
  'blogs.edit.all': 'Edit all blogs',
  'blogs.edit.own': 'Edit own blogs',
  'blogs.delete.all': 'Delete all blogs',
  'blogs.delete.own': 'Delete own blogs',
  'blogs.publish': 'Publish blogs',
  'taxonomies.manage': 'Manage categories & tags',
  'themes.view': 'View themes',
  'themes.manage': 'Manage themes',
  'plugins.view': 'View plugins',
  'plugins.manage': 'Manage plugins',
  'plugins.use': 'Use active plugins',
  'settings.manage': 'Manage site settings',
  'ai-settings.manage': 'Manage AI settings',
  'users.manage': 'Manage users & roles',
  'profile.edit': 'Edit own profile',
  'analytics.view': 'View analytics',
  'components.form-builder': 'Form Builder',
  'components.menu-redirect': 'Menu Redirect',
  'components.social-media': 'Social Media Integration',
  'components.uploaded-plugins': 'Uploaded plugin pages',
};

export const CAPABILITY_GROUPS: Array<{ id: string; label: string; capabilities: Capability[] }> = [
  { id: 'dashboard', label: 'Dashboard', capabilities: ['dashboard.view'] },
  {
    id: 'pages',
    label: 'Pages',
    capabilities: [
      'pages.view',
      'pages.create',
      'pages.edit.all',
      'pages.edit.own',
      'pages.delete.all',
      'pages.delete.own',
    ],
  },
  {
    id: 'blogs',
    label: 'Blogs',
    capabilities: [
      'blogs.view.all',
      'blogs.view.own',
      'blogs.create',
      'blogs.edit.all',
      'blogs.edit.own',
      'blogs.delete.all',
      'blogs.delete.own',
      'blogs.publish',
    ],
  },
  { id: 'taxonomies', label: 'Taxonomies', capabilities: ['taxonomies.manage'] },
  { id: 'themes', label: 'Themes', capabilities: ['themes.view', 'themes.manage'] },
  {
    id: 'plugins',
    label: 'Plugins',
    capabilities: ['plugins.view', 'plugins.manage', 'plugins.use'],
  },
  { id: 'settings', label: 'Site Settings', capabilities: ['settings.manage'] },
  { id: 'ai-settings', label: 'AI Settings', capabilities: ['ai-settings.manage'] },
  { id: 'users', label: 'Users & Roles', capabilities: ['users.manage'] },
  { id: 'profile', label: 'Profile', capabilities: ['profile.edit'] },
  { id: 'analytics', label: 'Analytics', capabilities: ['analytics.view'] },
  {
    id: 'dashboard-components',
    label: 'Dashboard Components',
    capabilities: [
      'components.form-builder',
      'components.menu-redirect',
      'components.social-media',
      'components.uploaded-plugins',
    ],
  },
];

/** Structured modules for the role management UI (grouped toggles). */
export interface RolePermissionModule {
  id: string;
  label: string;
  description: string;
  capabilities: Capability[];
}

export const ROLE_PERMISSION_MODULES: RolePermissionModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Main dashboard overview',
    capabilities: ['dashboard.view'],
  },
  {
    id: 'blogs',
    label: 'Blogs',
    description: 'Blog posts, categories, and tags',
    capabilities: [
      'blogs.view.all',
      'blogs.view.own',
      'blogs.create',
      'blogs.edit.all',
      'blogs.edit.own',
      'blogs.delete.all',
      'blogs.delete.own',
      'blogs.publish',
    ],
  },
  {
    id: 'pages',
    label: 'Pages',
    description: 'Headers, footers, and site pages',
    capabilities: [
      'pages.view',
      'pages.create',
      'pages.edit.all',
      'pages.edit.own',
      'pages.delete.all',
      'pages.delete.own',
    ],
  },
  {
    id: 'taxonomies',
    label: 'Categories & Tags',
    description: 'Blog taxonomies',
    capabilities: ['taxonomies.manage'],
  },
  {
    id: 'themes',
    label: 'Themes',
    description: 'Theme engine and theme management',
    capabilities: ['themes.view', 'themes.manage'],
  },
  {
    id: 'plugins',
    label: 'Plugins',
    description: 'Plugin marketplace, upload, and activation',
    capabilities: ['plugins.view', 'plugins.manage', 'plugins.use'],
  },
  {
    id: 'settings',
    label: 'Site Settings',
    description: 'General CMS configuration',
    capabilities: ['settings.manage'],
  },
  {
    id: 'ai-settings',
    label: 'AI Settings',
    description: 'AI provider and generation settings',
    capabilities: ['ai-settings.manage'],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    description: 'User accounts and custom roles',
    capabilities: ['users.manage'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Site and content analytics',
    capabilities: ['analytics.view'],
  },
  {
    id: 'dashboard-components',
    label: 'Dashboard Components',
    description: 'Built-in sidebar tools (Form Builder, Menu Redirect, Social Media, uploaded plugins)',
    capabilities: [
      'components.form-builder',
      'components.menu-redirect',
      'components.social-media',
      'components.uploaded-plugins',
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Edit own user profile',
    capabilities: ['profile.edit'],
  },
];

/** Sidebar / nav section visibility */
export type NavSectionId =
  | 'dashboard'
  | 'blogs'
  | 'pages'
  | 'themes'
  | 'plugins'
  | 'ai-settings'
  | 'users'
  | 'settings'
  | 'analytics'
  | 'form-builder'
  | 'menu-redirect'
  | 'social-media'
  | 'uploaded-plugins';

/** Core role capabilities — always read from code, never overridden by DB. */
export function getCoreCapabilitiesForRole(role: RoleValue): Capability[] {
  return [...(CAPS_BY_ROLE[role] ?? AUTHOR_CAPS)];
}

export function getMaxCapabilitiesForBaseRole(baseRole: RoleValue): Capability[] {
  return getCoreCapabilitiesForRole(baseRole);
}

export function validateCapabilitiesSubset(
  capabilities: Capability[],
  baseRole: RoleValue
): void {
  const allowed = new Set(getMaxCapabilitiesForBaseRole(baseRole));
  const invalid = capabilities.filter((cap) => !allowed.has(cap));
  if (invalid.length > 0) {
    throw new Error(
      `These permissions exceed the ${ROLE_LABELS[baseRole] ?? 'selected'} tier: ${invalid.join(', ')}`
    );
  }
}

/** Used by server-side capability resolution for plugin baseRole inheritance. */
export function getCapabilitiesForCoreOrPluginBaseRole(baseRole: RoleValue): Capability[] {
  return getCoreCapabilitiesForRole(baseRole);
}
