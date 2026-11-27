import type { ExtensionStatus } from '@/lib/extensions/constants';

/**
 * Legal status changes. Idempotent calls that leave the status unchanged
 * (enable when already enabled, disable when already disabled) are handled
 * by the lifecycle service and are not transitions.
 *
 * installed  → enabled | uninstalled | failed
 * enabled    → disabled | uninstalled | failed
 * disabled   → enabled | uninstalled | failed
 * failed     → installed | uninstalled
 * uninstalled → installed
 */
const TRANSITIONS: Record<ExtensionStatus, readonly ExtensionStatus[]> = {
  installed: ['enabled', 'uninstalled', 'failed'],
  enabled: ['disabled', 'uninstalled', 'failed'],
  disabled: ['enabled', 'uninstalled', 'failed'],
  failed: ['installed', 'uninstalled'],
  uninstalled: ['installed'],
};

export function canTransition(from: ExtensionStatus, to: ExtensionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ExtensionStatus, to: ExtensionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot change an extension from "${from}" to "${to}".`);
  }
}
