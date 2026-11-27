import { getUserDbConnection } from '@/utils/db';
import { roleSchema, type RoleType } from '@/models/Role';
import { ROLE, ROLE_LABELS, type RoleValue } from '@/lib/rbac/roles';
import {
  type Capability,
  getCoreCapabilitiesForRole,
  validateCapabilitiesSubset,
  ALL_CAPABILITIES,
  CAPABILITY_GROUPS,
  ROLE_PERMISSION_MODULES,
} from '@/lib/rbac/capabilityDefinitions';
import {
  EDITOR_COMPONENT_OPTIONS,
  getEditorComponentGroups,
  getDefaultEditorComponentsForBaseRole,
  normalizeEditorComponents,
} from '@/lib/rbac/editorComponentDefinitions';
import { PLUGIN_ROLE_MIN, getAllPluginUserTypes } from '@/lib/rbac/pluginUserTypes';
import { listActivePluginOptions, type PluginOption } from '@/lib/rbac/pluginAccess';
import {
  CUSTOM_ROLE_MIN,
  CUSTOM_ROLE_MAX,
  type CustomRoleDefinition,
  type CustomRolePluginPageAccess,
  isCustomRoleValue,
  setCustomRolesCache,
  clearCustomRolesCache,
  findCustomRoleByValueSync,
} from '@/lib/rbac/customRoleCache';

export {
  CUSTOM_ROLE_MIN,
  CUSTOM_ROLE_MAX,
  isCustomRoleValue,
  findCustomRoleByValueSync,
  type CustomRoleDefinition,
  type CustomRolePluginPageAccess,
} from '@/lib/rbac/customRoleCache';

export interface RoleListEntry {
  name: string;
  value: number;
  type: RoleType;
  baseRole: number;
  capabilities: Capability[];
  allowedComponents: string[];
  allowedPlugins: string[];
  pluginPageAccess: CustomRolePluginPageAccess[];
  editable: boolean;
  pluginId?: string;
}

let cacheReady: Promise<void> | null = null;

async function refreshCache(): Promise<void> {
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const docs = (await Role.find({
    value: { $gte: CUSTOM_ROLE_MIN, $lte: CUSTOM_ROLE_MAX },
    type: 'custom',
  }).lean()) as unknown as Array<{
    name: string;
    value: number;
    baseRole?: number;
    capabilities?: string[];
    allowedComponents?: string[];
    allowedPlugins?: string[];
    pluginPageAccess?: CustomRolePluginPageAccess[];
  }>;

  setCustomRolesCache(
    docs.map((doc) => {
      const baseRole = (doc.baseRole ?? ROLE.AUTHOR) as RoleValue;
      return {
        name: doc.name,
        value: doc.value,
        type: 'custom',
        baseRole,
        capabilities: (doc.capabilities ?? []).filter((cap): cap is Capability =>
          ALL_CAPABILITIES.includes(cap as Capability)
        ),
        allowedComponents:
          doc.allowedComponents?.length
            ? doc.allowedComponents.filter(Boolean)
            : getDefaultEditorComponentsForBaseRole(baseRole),
        // Undefined = unrestricted (all active plugins) — preserved as-is, not defaulted.
        allowedPlugins: doc.allowedPlugins,
        pluginPageAccess: Array.isArray(doc.pluginPageAccess)
          ? doc.pluginPageAccess
          : undefined,
      };
    })
  );
}

export async function ensureCustomRolesCache(): Promise<void> {
  if (!cacheReady) {
    cacheReady = refreshCache();
  }
  await cacheReady;
}

export function invalidateCustomRolesCache(): void {
  cacheReady = null;
  clearCustomRolesCache();
}

export async function findCustomRoleByValue(
  roleValue: number
): Promise<CustomRoleDefinition | null> {
  await ensureCustomRolesCache();
  return findCustomRoleByValueSync(roleValue);
}

export function isSystemRoleValue(role: number): boolean {
  return Number.isFinite(role) && role >= ROLE.SUPER_ADMIN && role <= ROLE.AUTHOR;
}

export function inferRoleType(value: number, storedType?: RoleType): RoleType {
  if (storedType === 'system' || storedType === 'custom' || storedType === 'plugin') {
    return storedType;
  }
  if (isSystemRoleValue(value)) return 'system';
  if (isCustomRoleValue(value)) return 'custom';
  if (value >= PLUGIN_ROLE_MIN) return 'plugin';
  return 'custom';
}

async function collectUsedRoleValues(): Promise<Set<number>> {
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const docs = (await Role.find({}, { value: 1 }).lean()) as unknown as Array<{ value: number }>;
  return new Set(docs.map((doc) => doc.value));
}

function allocateNextCustomRoleValue(used: Set<number>): number {
  for (let value = CUSTOM_ROLE_MIN; value <= CUSTOM_ROLE_MAX; value += 1) {
    if (!used.has(value)) return value;
  }
  throw new Error(`Maximum custom roles reached (${CUSTOM_ROLE_MIN}–${CUSTOM_ROLE_MAX})`);
}

export function getAllowedBaseRoles(): Array<{ value: RoleValue; label: string }> {
  return [
    { value: ROLE.ADMIN, label: ROLE_LABELS[ROLE.ADMIN] },
    { value: ROLE.EDITOR, label: ROLE_LABELS[ROLE.EDITOR] },
    { value: ROLE.AUTHOR, label: ROLE_LABELS[ROLE.AUTHOR] },
  ];
}

/** Infer core tier from selected permissions (used internally — not shown in UI). */
export function deriveBaseRoleFromCapabilities(capabilities: Capability[]): RoleValue {
  const adminOnly: Capability[] = [
    'users.manage',
    'settings.manage',
    'ai-settings.manage',
    'plugins.manage',
  ];
  if (capabilities.some((cap) => adminOnly.includes(cap))) {
    return ROLE.ADMIN;
  }

  const editorSignals: Capability[] = [
    'pages.edit.all',
    'pages.delete.all',
    'blogs.view.all',
    'blogs.edit.all',
    'blogs.delete.all',
    'blogs.publish',
    'taxonomies.manage',
    'themes.manage',
    'analytics.view',
    'plugins.view',
    'components.form-builder',
    'components.menu-redirect',
    'components.social-media',
    'components.uploaded-plugins',
  ];
  if (capabilities.some((cap) => editorSignals.includes(cap))) {
    return ROLE.EDITOR;
  }

  return ROLE.AUTHOR;
}

/**
 * `undefined` means the caller didn't touch plugin access — stays unrestricted (all active
 * plugins, including ones installed later). An explicit array (even empty) is the admin's
 * real selection and is stored as-is, filtered to currently-active plugin ids.
 */
function normalizeAllowedPlugins(raw: unknown, activePluginIds: string[]): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return [...activePluginIds];
  const activeSet = new Set(activePluginIds);
  return [...new Set(raw.map(String))].filter((id) => activeSet.has(id));
}

function normalizePageFeatures(raw: unknown): string[] | '*' {
  if (raw === '*' || raw === undefined) return '*';
  if (!Array.isArray(raw)) return '*';
  return raw
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function normalizePluginPageAccess(
  raw: unknown,
  allowedPlugins: string[] | undefined,
  activePluginIds: string[]
): CustomRolePluginPageAccess[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return undefined;

  const allowedSet = new Set(allowedPlugins ?? activePluginIds);
  const out: CustomRolePluginPageAccess[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const pluginId = String(obj.pluginId || '').trim();
    if (!pluginId || !allowedSet.has(pluginId)) continue;

    const pagesRaw = obj.pages;
    let pages: Array<{ id: string; features: string[] | '*' }> = [];
    if (pagesRaw === '*' || pagesRaw === undefined) {
      pages = [{ id: '*', features: '*' }];
    } else if (Array.isArray(pagesRaw)) {
      pages = pagesRaw
        .map((page) => {
          if (typeof page === 'string') {
            const id = page.trim();
            if (!id) return null;
            return { id, features: '*' as const };
          }
          if (!page || typeof page !== 'object') return null;
          const pageObj = page as Record<string, unknown>;
          const id = String(pageObj.id || '').trim();
          if (!id) return null;
          return { id, features: normalizePageFeatures(pageObj.features) };
        })
        .filter((page): page is { id: string; features: string[] | '*' } => page !== null);
      if (pages.some((page) => page.id === '*')) {
        pages = [{ id: '*', features: '*' }];
      }
    }

    let permissions: string[] | undefined;
    if (Array.isArray(obj.permissions)) {
      permissions = obj.permissions
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .map((p) => p.trim());
    }

    out.push({ pluginId, pages, permissions });
  }

  return out;
}

export function normalizeCustomRoleInput(
  input: {
    name?: string;
    baseRole?: number;
    capabilities?: unknown;
    allowedComponents?: unknown;
    allowedPlugins?: unknown;
    pluginPageAccess?: unknown;
  },
  activePluginIds: string[]
): {
  name: string;
  baseRole: RoleValue;
  capabilities: Capability[];
  allowedComponents: string[];
  allowedPlugins: string[] | undefined;
  pluginPageAccess: CustomRolePluginPageAccess[] | undefined;
} {
  const name = String(input.name ?? '').trim();
  if (!name) {
    throw new Error('Role name is required');
  }
  if (name.length > 64) {
    throw new Error('Role name must be 64 characters or fewer');
  }

  if (!Array.isArray(input.capabilities) || input.capabilities.length === 0) {
    throw new Error('Select at least one permission');
  }

  const capabilities = [...new Set(input.capabilities.map(String))].filter((cap): cap is Capability =>
    ALL_CAPABILITIES.includes(cap as Capability)
  );

  if (capabilities.length === 0) {
    throw new Error('Select at least one valid permission');
  }

  // Allow any permission combination in the UI; validate against full admin set.
  validateCapabilitiesSubset(capabilities, ROLE.ADMIN);
  const baseRole = deriveBaseRoleFromCapabilities(capabilities);
  const allowedComponents = normalizeEditorComponents(input.allowedComponents, ROLE.ADMIN);
  const allowedPlugins = normalizeAllowedPlugins(input.allowedPlugins, activePluginIds);
  const pluginPageAccess = normalizePluginPageAccess(
    input.pluginPageAccess,
    allowedPlugins,
    activePluginIds
  );

  return { name, baseRole, capabilities, allowedComponents, allowedPlugins, pluginPageAccess };
}

export async function listRolesForManagement(): Promise<{
  roles: RoleListEntry[];
  capabilityGroups: typeof CAPABILITY_GROUPS;
  permissionModules: typeof ROLE_PERMISSION_MODULES;
  editorComponentOptions: typeof EDITOR_COMPONENT_OPTIONS;
  editorComponentGroups: ReturnType<typeof getEditorComponentGroups>;
  baseRoleOptions: ReturnType<typeof getAllowedBaseRoles>;
  plugins: PluginOption[];
}> {
  await ensureCustomRolesCache();
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const docs = (await Role.find({}).sort({ value: 1 }).lean()) as unknown as Array<{
    name: string;
    value: number;
    type?: RoleType;
    baseRole?: number;
    capabilities?: string[];
    pluginId?: string;
  }>;
  const plugins = await listActivePluginOptions();
  const activePluginIds = plugins.map((p) => p.pluginId);
  const pluginTypes = await getAllPluginUserTypes();
  const pluginTypeByValue = new Map(pluginTypes.map((entry) => [entry.value, entry]));

  const roles: RoleListEntry[] = [];

  for (const doc of docs) {
    const type = inferRoleType(doc.value, doc.type);

    if (type === 'plugin') {
      const pluginType = pluginTypeByValue.get(doc.value);
      roles.push({
        name: pluginType?.name ?? doc.name,
        value: doc.value,
        type,
        baseRole: pluginType?.baseRole ?? doc.baseRole ?? ROLE.AUTHOR,
        capabilities: [],
        allowedComponents: [],
        allowedPlugins: [pluginType?.pluginId || doc.pluginId].filter(Boolean) as string[],
        pluginPageAccess: pluginType?.pageAccess
          ? [{ pluginId: pluginType.pluginId, pages: pluginType.pageAccess, permissions: pluginType.permissions }]
          : [],
        editable: false,
        pluginId: pluginType?.pluginId || doc.pluginId,
      });
      continue;
    }

    if (type === 'system') {
      roles.push({
        name: doc.name,
        value: doc.value,
        type,
        baseRole: doc.value,
        capabilities: getCoreCapabilitiesForRole(doc.value as RoleValue),
        allowedComponents: getDefaultEditorComponentsForBaseRole(doc.value as RoleValue),
        allowedPlugins: activePluginIds,
        pluginPageAccess: [],
        editable: false,
      });
      continue;
    }

    const custom = findCustomRoleByValueSync(doc.value);
    roles.push({
      name: doc.name,
      value: doc.value,
      type: 'custom',
      baseRole: custom?.baseRole ?? doc.baseRole ?? ROLE.AUTHOR,
      capabilities: custom?.capabilities ?? [],
      allowedComponents:
        custom?.allowedComponents ??
        getDefaultEditorComponentsForBaseRole((custom?.baseRole ?? ROLE.AUTHOR) as RoleValue),
      // Undefined cache entry (never configured) resolves to "all active plugins" for display.
      allowedPlugins: custom?.allowedPlugins ?? activePluginIds,
      pluginPageAccess: custom?.pluginPageAccess ?? [],
      editable: true,
    });
  }

  return {
    roles,
    capabilityGroups: CAPABILITY_GROUPS,
    permissionModules: ROLE_PERMISSION_MODULES,
    editorComponentOptions: EDITOR_COMPONENT_OPTIONS,
    editorComponentGroups: getEditorComponentGroups(),
    baseRoleOptions: getAllowedBaseRoles(),
    plugins,
  };
}

export async function createCustomRole(input: {
  name: string;
  baseRole: number;
  capabilities: string[];
  allowedComponents?: string[];
  allowedPlugins?: string[];
  pluginPageAccess?: CustomRolePluginPageAccess[];
}): Promise<CustomRoleDefinition> {
  const activePluginIds = (await listActivePluginOptions()).map((p) => p.pluginId);
  const normalized = normalizeCustomRoleInput(input, activePluginIds);
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);

  const existingName = await Role.findOne({ name: normalized.name }).lean();
  if (existingName) {
    throw new Error('A role with this name already exists');
  }

  const used = await collectUsedRoleValues();
  const value = allocateNextCustomRoleValue(used);

  await Role.create({
    name: normalized.name,
    value,
    type: 'custom',
    baseRole: normalized.baseRole,
    capabilities: normalized.capabilities,
    allowedComponents: normalized.allowedComponents,
    allowedPlugins: normalized.allowedPlugins,
    pluginPageAccess: normalized.pluginPageAccess,
  });

  invalidateCustomRolesCache();
  await ensureCustomRolesCache();

  return {
    name: normalized.name,
    value,
    type: 'custom',
    baseRole: normalized.baseRole,
    capabilities: normalized.capabilities,
    allowedComponents: normalized.allowedComponents,
    allowedPlugins: normalized.allowedPlugins,
    pluginPageAccess: normalized.pluginPageAccess,
  };
}

export async function updateCustomRole(
  value: number,
  input: {
    name?: string;
    baseRole?: number;
    capabilities?: string[];
    allowedComponents?: string[];
    allowedPlugins?: string[];
    pluginPageAccess?: CustomRolePluginPageAccess[];
  }
): Promise<CustomRoleDefinition> {
  if (!isCustomRoleValue(value)) {
    throw new Error('Only custom roles can be edited');
  }

  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const existing = (await Role.findOne({ value }).lean()) as {
    name: string;
    baseRole?: number;
    capabilities?: string[];
    allowedComponents?: string[];
    allowedPlugins?: string[];
    pluginPageAccess?: CustomRolePluginPageAccess[];
    type?: RoleType;
  } | null;

  if (!existing || inferRoleType(value, existing.type) !== 'custom') {
    throw new Error('Custom role not found');
  }

  const activePluginIds = (await listActivePluginOptions()).map((p) => p.pluginId);
  const normalized = normalizeCustomRoleInput(
    {
      name: input.name ?? existing.name,
      capabilities: input.capabilities ?? existing.capabilities ?? [],
      allowedComponents: input.allowedComponents ?? existing.allowedComponents,
      allowedPlugins: input.allowedPlugins !== undefined ? input.allowedPlugins : existing.allowedPlugins,
      pluginPageAccess:
        input.pluginPageAccess !== undefined ? input.pluginPageAccess : existing.pluginPageAccess,
    },
    activePluginIds
  );

  const nameConflict = await Role.findOne({
    name: normalized.name,
    value: { $ne: value },
  }).lean();
  if (nameConflict) {
    throw new Error('A role with this name already exists');
  }

  await Role.updateOne(
    { value },
    {
      $set: {
        name: normalized.name,
        type: 'custom',
        baseRole: normalized.baseRole,
        capabilities: normalized.capabilities,
        allowedComponents: normalized.allowedComponents,
        allowedPlugins: normalized.allowedPlugins,
        pluginPageAccess: normalized.pluginPageAccess ?? [],
      },
    }
  ).exec();

  invalidateCustomRolesCache();
  await ensureCustomRolesCache();

  return {
    name: normalized.name,
    value,
    type: 'custom',
    baseRole: normalized.baseRole,
    capabilities: normalized.capabilities,
    allowedComponents: normalized.allowedComponents,
    allowedPlugins: normalized.allowedPlugins,
    pluginPageAccess: normalized.pluginPageAccess,
  };
}

export async function deleteCustomRole(value: number): Promise<void> {
  if (!isCustomRoleValue(value)) {
    throw new Error('Only custom roles can be deleted');
  }

  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const existing = await Role.findOne({ value }).lean();
  if (!existing || inferRoleType(value, (existing as { type?: RoleType }).type) !== 'custom') {
    throw new Error('Custom role not found');
  }

  const User = userDb.models.User;
  if (User) {
    await User.updateMany({ role: value }, { $set: { role: ROLE.AUTHOR } }).exec();
  }

  await Role.deleteOne({ value }).exec();
  invalidateCustomRolesCache();
}

export async function ensureSystemRolesMarked(): Promise<void> {
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const systemRoles = [
    { name: 'SuperAdmin', value: ROLE.SUPER_ADMIN },
    { name: 'Admin', value: ROLE.ADMIN },
    { name: 'Editor', value: ROLE.EDITOR },
    { name: 'Author', value: ROLE.AUTHOR },
  ];

  for (const role of systemRoles) {
    await Role.findOneAndUpdate(
      { value: role.value },
      {
        $set: {
          name: role.name,
          value: role.value,
          type: 'system',
        },
        $unset: { baseRole: '', capabilities: '' },
      },
      { upsert: true, new: true }
    ).exec();
  }
}
