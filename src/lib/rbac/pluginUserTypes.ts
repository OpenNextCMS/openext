import { getUserDbConnection, getSettingsModel } from '@/utils/db';
import { roleSchema } from '@/models/Role';
import { ROLE, normalizeRole, ROLE_LABELS, type RoleValue } from '@/lib/rbac/roles';
import {
  findCustomRoleByValueSync,
  isCustomRoleValue,
} from '@/lib/rbac/customRoleCache';

/** Plugin-defined roles must use numeric values >= 100 (core CMS uses 0–3). */
export const PLUGIN_ROLE_MIN = 100;

export interface PluginUserTypeDefinition {
  pluginId: string;
  id: string;
  name: string;
  value: number;
  /** Core role tier whose CMS capabilities this user type inherits. */
  baseRole: RoleValue;
  /** Subset of the plugin manifest permissions granted to this user type. */
  permissions: string[];
  /**
   * Which adminNav pages / page features this role may use.
   * [{ id: '*', features: '*' }] = all pages.
   */
  pageAccess?: Array<{ id: string; features: string[] | '*' }>;
}

/** Parsed from manifest before the CMS assigns stable numeric role values. */
export type PluginUserTypeDraft = Omit<PluginUserTypeDefinition, 'value'> & {
  value?: number;
};

interface PluginUserTypesStore {
  [pluginId: string]: PluginUserTypeDefinition[];
}

let cacheByValue = new Map<number, PluginUserTypeDefinition>();
let cacheReady: Promise<void> | null = null;

async function readUserTypesStore(): Promise<PluginUserTypesStore> {
  await getUserDbConnection();
  const Settings = getSettingsModel();
  const settings = await Settings.findOne({}).lean();
  const store = (settings as { pluginUserTypes?: PluginUserTypesStore } | null)?.pluginUserTypes;
  return store && typeof store === 'object' ? { ...store } : {};
}

async function writeUserTypesStore(store: PluginUserTypesStore): Promise<void> {
  await getUserDbConnection();
  const Settings = getSettingsModel();
  await Settings.updateOne({}, { $set: { pluginUserTypes: store } }, { upsert: true });
}

async function refreshCache(): Promise<void> {
  const store = await readUserTypesStore();
  const all = Object.values(store).flat();
  cacheByValue = new Map(all.map((entry) => [entry.value, entry]));
}

export async function ensurePluginUserTypesCache(): Promise<void> {
  if (!cacheReady) {
    cacheReady = refreshCache();
  }
  await cacheReady;
}

export function invalidatePluginUserTypesCache(): void {
  cacheReady = null;
}

export function isCoreRoleValue(role: number): boolean {
  return Number.isFinite(role) && role >= ROLE.SUPER_ADMIN && role <= ROLE.AUTHOR;
}

export function isPluginRoleValue(role: number): boolean {
  return Number.isFinite(role) && role >= PLUGIN_ROLE_MIN;
}

/** Preserve custom (4–99) and plugin (≥100) role numbers; map unknown core values to Author. */
export function resolveRoleValue(role: number | string | undefined | null): number {
  if (typeof role === 'number' && Number.isFinite(role)) {
    if (role <= ROLE.SUPER_ADMIN) return ROLE.SUPER_ADMIN;
    if (role === ROLE.ADMIN) return ROLE.ADMIN;
    if (role === ROLE.EDITOR) return ROLE.EDITOR;
    if (role === ROLE.AUTHOR) return ROLE.AUTHOR;
    if (isCustomRoleValue(role)) return role;
    if (role >= PLUGIN_ROLE_MIN) return role;
    return ROLE.AUTHOR;
  }
  if (typeof role === 'string') {
    const parsed = parseInt(role, 10);
    if (Number.isFinite(parsed)) return resolveRoleValue(parsed);
    return normalizeRole(role);
  }
  return ROLE.AUTHOR;
}

export function findPluginUserTypeByValueSync(
  roleValue: number
): PluginUserTypeDefinition | null {
  return cacheByValue.get(roleValue) ?? null;
}

export async function getAllPluginUserTypes(): Promise<PluginUserTypeDefinition[]> {
  await ensurePluginUserTypesCache();
  return [...cacheByValue.values()];
}

export async function findPluginUserTypeByValue(
  roleValue: number
): Promise<PluginUserTypeDefinition | null> {
  await ensurePluginUserTypesCache();
  return findPluginUserTypeByValueSync(roleValue);
}

/** Map any role (core, custom, or plugin) to the core tier used for min-role checks. */
export function getEffectiveCoreRole(role: number | string | undefined | null): RoleValue {
  const resolved = resolveRoleValue(role);

  const customRole = findCustomRoleByValueSync(resolved);
  if (customRole) return customRole.baseRole;

  const pluginType = findPluginUserTypeByValueSync(resolved);
  if (pluginType) return pluginType.baseRole;
  return normalizeRole(resolved);
}

export async function isAllowedRoleValue(role: number): Promise<boolean> {
  if (!Number.isFinite(role) || role < 0) return false;
  if (isCoreRoleValue(role)) return true;

  if (isCustomRoleValue(role)) {
    const { ensureCustomRolesCache } = await import('@/lib/rbac/customRoles');
    await ensureCustomRolesCache();
    return findCustomRoleByValueSync(role) !== null;
  }

  await ensurePluginUserTypesCache();
  return cacheByValue.has(role);
}

export async function getRoleLabel(role: number): Promise<string> {
  await getUserDbConnection();
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const doc = (await Role.findOne({ value: role }).lean()) as { name?: string } | null;
  if (doc?.name) {
    return doc.name;
  }

  const pluginType = await findPluginUserTypeByValue(role);
  if (pluginType) return pluginType.name;

  return ROLE_LABELS[role] ?? `Role ${role}`;
}

function slugifyUserTypeId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function parsePluginUserTypesFromManifest(
  pluginId: string,
  raw: unknown,
  manifestPermissions: string[],
  sourceLabel = 'manifest.json "userTypes"'
): PluginUserTypeDraft[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const permissionSet = new Set(manifestPermissions);
  const seenIds = new Set<string>();
  const out: PluginUserTypeDraft[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      throw new Error(`${sourceLabel} entries must be objects`);
    }
    const obj = item as Record<string, unknown>;
    const name = String(obj.name || '').trim();
    if (!name) {
      throw new Error(`${sourceLabel} entry is missing "name"`);
    }

    const idRaw =
      typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : slugifyUserTypeId(name);
    const id = idRaw || slugifyUserTypeId(`${pluginId}-role`);
    if (seenIds.has(id)) {
      throw new Error(`${sourceLabel} has duplicate id "${id}"`);
    }
    seenIds.add(id);

    let explicitValue: number | undefined;
    const valueRaw = obj.value;
    if (valueRaw !== undefined && valueRaw !== null && valueRaw !== '') {
      const value =
        typeof valueRaw === 'number'
          ? valueRaw
          : typeof valueRaw === 'string'
            ? parseInt(valueRaw, 10)
            : NaN;
      if (!Number.isFinite(value) || value < PLUGIN_ROLE_MIN) {
        throw new Error(
          `${sourceLabel} entry "${name}" has invalid "value" (must be >= ${PLUGIN_ROLE_MIN} when provided)`
        );
      }
      if (isCoreRoleValue(value)) {
        throw new Error(
          `${sourceLabel} entry "${name}" cannot use reserved core role value ${value}`
        );
      }
      explicitValue = value;
    }

    // Plugin roles default to Author — they are tied to Author CMS access + this plugin.
    const baseRoleRaw = obj.baseRole;
    const baseRole =
      baseRoleRaw === undefined || baseRoleRaw === null
        ? ROLE.AUTHOR
        : typeof baseRoleRaw === 'number'
          ? baseRoleRaw
          : parseInt(String(baseRoleRaw), 10);
    if (!isCoreRoleValue(baseRole) || baseRole === ROLE.SUPER_ADMIN) {
      throw new Error(
        `${sourceLabel} entry "${name}" has invalid baseRole (use Author=3 or Editor=2; SuperAdmin is not allowed)`
      );
    }

    const permissions = Array.isArray(obj.permissions)
      ? obj.permissions.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [];

    if (permissions.length === 0) {
      throw new Error(
        `${sourceLabel} entry "${name}" must list at least one plugin permission in "permissions"`
      );
    }

    for (const perm of permissions) {
      if (!permissionSet.has(perm)) {
        throw new Error(
          `${sourceLabel} entry "${name}" references unknown permission "${perm}" (declare it in manifest.permissions)`
        );
      }
    }

    out.push({
      pluginId,
      id,
      name,
      ...(explicitValue !== undefined ? { value: explicitValue } : {}),
      baseRole: baseRole as RoleValue,
      permissions,
    });
  }

  return out;
}

async function collectUsedRoleValues(excludePluginId?: string): Promise<Set<number>> {
  await ensurePluginUserTypesCache();
  const used = new Set<number>([ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.EDITOR, ROLE.AUTHOR]);

  const store = await readUserTypesStore();
  for (const [pluginId, entries] of Object.entries(store)) {
    if (pluginId === excludePluginId) continue;
    for (const entry of entries) {
      used.add(entry.value);
    }
  }

  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const roleDocs = (await Role.find({ value: { $gte: PLUGIN_ROLE_MIN } }).lean()) as Array<{
    value?: number;
  }>;
  for (const doc of roleDocs) {
    if (typeof doc.value === 'number') used.add(doc.value);
  }

  return used;
}

function allocateNextRoleValue(used: Set<number>): number {
  let candidate = PLUGIN_ROLE_MIN;
  while (used.has(candidate)) {
    candidate += 1;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Assign stable numeric role values before registration.
 * Reuses values for the same plugin + user type id; otherwise auto-allocates.
 */
export async function resolvePluginUserTypeValues(
  pluginId: string,
  drafts: PluginUserTypeDraft[]
): Promise<PluginUserTypeDefinition[]> {
  if (drafts.length === 0) return [];

  const store = await readUserTypesStore();
  const previous = store[pluginId] || [];
  const previousById = new Map(previous.map((entry) => [entry.id, entry]));
  const used = await collectUsedRoleValues(pluginId);

  for (const entry of previous) {
    used.add(entry.value);
  }

  const resolved: PluginUserTypeDefinition[] = [];

  for (const draft of drafts) {
    const kept = previousById.get(draft.id);
    if (kept) {
      resolved.push({
        pluginId: draft.pluginId,
        id: draft.id,
        name: draft.name,
        value: kept.value,
        baseRole: draft.baseRole,
        permissions: draft.permissions,
        pageAccess: draft.pageAccess,
      });
      continue;
    }

    let value = draft.value;
    if (value !== undefined) {
      if (used.has(value)) {
        throw new Error(
          `User type "${draft.name}" requested value ${value}, but it is already in use`
        );
      }
      used.add(value);
    } else {
      value = allocateNextRoleValue(used);
    }

    resolved.push({
      pluginId: draft.pluginId,
      id: draft.id,
      name: draft.name,
      value,
      baseRole: draft.baseRole,
      permissions: draft.permissions,
      pageAccess: draft.pageAccess,
    });
  }

  const removed = previous.filter((entry) => !drafts.some((draft) => draft.id === entry.id));
  for (const entry of removed) {
    await reassignUsersFromRole(entry.value, ROLE.AUTHOR);
    await removeRoleDocuments([entry.value], [entry.name]);
  }

  return resolved;
}

async function assertNoGlobalValueConflicts(
  pluginId: string,
  userTypes: PluginUserTypeDefinition[]
): Promise<void> {
  await ensurePluginUserTypesCache();
  const store = await readUserTypesStore();

  for (const entry of userTypes) {
    for (const [otherPluginId, entries] of Object.entries(store)) {
      if (otherPluginId === pluginId) continue;
      if (entries.some((item) => item.value === entry.value)) {
        throw new Error(
          `User type value ${entry.value} is already used by plugin "${otherPluginId}"`
        );
      }
    }
  }
}

async function upsertRoleDocuments(userTypes: PluginUserTypeDefinition[]): Promise<void> {
  if (userTypes.length === 0) return;
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);

  for (const entry of userTypes) {
    // Re-installs can allocate a new numeric value while an orphaned Role row still
    // holds the same display name — unique index on name would reject the upsert.
    await Role.deleteMany({
      name: entry.name,
      value: { $ne: entry.value },
    }).exec();

    await Role.findOneAndUpdate(
      { value: entry.value },
      {
        $set: {
          name: entry.name,
          value: entry.value,
          type: 'plugin',
          baseRole: entry.baseRole,
          // Scope this role to the plugin that registered it.
          allowedPlugins: [entry.pluginId],
          pluginId: entry.pluginId,
        },
        $unset: { capabilities: '', allowedComponents: '' },
      },
      { upsert: true, new: true }
    ).exec();
  }
}

async function removeRoleDocuments(values: number[], names: string[] = []): Promise<void> {
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const clauses: Array<Record<string, unknown>> = [];
  if (values.length > 0) {
    clauses.push({ value: { $in: values } });
  }
  if (names.length > 0) {
    clauses.push({ name: { $in: names } });
  }
  if (clauses.length === 0) return;
  await Role.deleteMany(clauses.length === 1 ? clauses[0] : { $or: clauses }).exec();
}

async function reassignUsersFromRole(fromRole: number, toRole: number): Promise<void> {
  const userDb = await getUserDbConnection();
  const User = userDb.models.User;
  if (!User) return;
  await User.updateMany({ role: fromRole }, { $set: { role: toRole } }).exec();
}

export async function registerPluginUserTypes(
  pluginId: string,
  drafts: PluginUserTypeDraft[]
): Promise<void> {
  if (drafts.length === 0) return;

  const userTypes = await resolvePluginUserTypeValues(pluginId, drafts);
  await assertNoGlobalValueConflicts(pluginId, userTypes);

  const store = await readUserTypesStore();
  store[pluginId] = userTypes;
  await writeUserTypesStore(store);
  await upsertRoleDocuments(userTypes);
  invalidatePluginUserTypesCache();
  await ensurePluginUserTypesCache();
}

export async function unregisterPluginUserTypes(pluginId: string): Promise<void> {
  const store = await readUserTypesStore();
  const existing = store[pluginId] || [];

  for (const entry of existing) {
    await reassignUsersFromRole(entry.value, ROLE.AUTHOR);
  }

  if (existing.length > 0) {
    delete store[pluginId];
    await writeUserTypesStore(store);
    await removeRoleDocuments(
      existing.map((entry) => entry.value),
      existing.map((entry) => entry.name)
    );
  }

  invalidatePluginUserTypesCache();
  await ensurePluginUserTypesCache();
}

export async function syncPluginUserTypesFromStore(): Promise<void> {
  invalidatePluginUserTypesCache();
  await ensurePluginUserTypesCache();
  const all = [...cacheByValue.values()];
  await upsertRoleDocuments(all);
}

/** Remove Role rows for uninstalled plugins (Settings store no longer references them). */
export async function cleanupOrphanedPluginRoles(): Promise<number> {
  await ensurePluginUserTypesCache();
  const userDb = await getUserDbConnection();
  const Role = userDb.models.Role || userDb.model('Role', roleSchema);
  const docs = (await Role.find({ value: { $gte: PLUGIN_ROLE_MIN } }).lean()) as unknown as Array<{
    value: number;
  }>;

  let removed = 0;
  for (const doc of docs) {
    if (cacheByValue.has(doc.value)) continue;
    await reassignUsersFromRole(doc.value, ROLE.AUTHOR);
    await Role.deleteOne({ value: doc.value }).exec();
    removed += 1;
  }
  return removed;
}
