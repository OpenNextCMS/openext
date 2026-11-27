export { ROLE, ROLE_LABELS, normalizeRole, isAdminTier, isEditorTier, isAuthorTier } from '@/lib/rbac/roles';
export type { RoleValue } from '@/lib/rbac/roles';
export type { Capability, NavSectionId } from '@/lib/rbac/capabilityDefinitions';
export {
  ALL_CAPABILITIES,
  CAPABILITY_LABELS,
  CAPABILITY_GROUPS,
  ROLE_PERMISSION_MODULES,
  getCoreCapabilitiesForRole,
  getMaxCapabilitiesForBaseRole,
  validateCapabilitiesSubset,
} from '@/lib/rbac/capabilityDefinitions';
export {
  hasCapability,
  getCapabilitiesForRole,
  canSeeNavSection,
} from '@/lib/rbac/capabilities';
export {
  EDITOR_COMPONENT_OPTIONS,
  getEditorComponentGroups,
  getDefaultEditorComponentsForBaseRole,
  getMaxEditorComponentsForBaseRole,
  normalizeEditorComponents,
  validateEditorComponentsSubset,
} from '@/lib/rbac/editorComponentDefinitions';
export { getAllowedEditorComponents } from '@/lib/rbac/editorComponents';
export {
  listActivePluginOptions,
  getAllowedPluginIds,
  canUsePlugin,
  type PluginOption,
} from '@/lib/rbac/pluginAccess';
export {
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  listRolesForManagement,
  ensureCustomRolesCache,
  ensureSystemRolesMarked,
  getAllowedBaseRoles,
  CUSTOM_ROLE_MIN,
  CUSTOM_ROLE_MAX,
  type CustomRoleDefinition,
  type RoleListEntry,
} from '@/lib/rbac/customRoles';
export {
  requireRbac,
  requireCapability,
  requireAnyCapability,
  requireMinRole,
  assertResourceOwnership,
  canPublishContent,
  getRoleFromUser,
  isAdminTier as isAdminRole,
  type RbacContext,
} from '@/lib/rbac/guard';
export { resolvePluginPermissionsForRole } from '@/lib/rbac/pluginPermissions';
export {
  PLUGIN_ROLE_MIN,
  parsePluginUserTypesFromManifest,
  registerPluginUserTypes,
  cleanupOrphanedPluginRoles,
  unregisterPluginUserTypes,
  isAllowedRoleValue,
  getRoleLabel,
  resolveRoleValue,
  getEffectiveCoreRole,
  resolvePluginUserTypeValues,
  type PluginUserTypeDefinition,
  type PluginUserTypeDraft,
} from '@/lib/rbac/pluginUserTypes';
