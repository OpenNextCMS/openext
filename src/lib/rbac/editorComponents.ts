import { findCustomRoleByValueSync } from '@/lib/rbac/customRoleCache';
import { resolveRoleValue, getEffectiveCoreRole } from '@/lib/rbac/pluginUserTypes';
import { getDefaultEditorComponentsForBaseRole } from '@/lib/rbac/editorComponentDefinitions';

export {
  EDITOR_COMPONENT_OPTIONS,
  getEditorComponentGroups,
  getDefaultEditorComponentsForBaseRole,
  getMaxEditorComponentsForBaseRole,
  normalizeEditorComponents,
  validateEditorComponentsSubset,
} from '@/lib/rbac/editorComponentDefinitions';

/** Resolve which blog editor blocks the user may add. */
export function getAllowedEditorComponents(role: number | string | undefined | null): string[] {
  const resolved = resolveRoleValue(role);
  const custom = findCustomRoleByValueSync(resolved);
  if (custom?.allowedComponents?.length) {
    return [...custom.allowedComponents];
  }
  const coreRole = custom?.baseRole ?? getEffectiveCoreRole(resolved);
  return getDefaultEditorComponentsForBaseRole(coreRole);
}
