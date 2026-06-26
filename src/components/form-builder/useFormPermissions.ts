'use client';

import { useEffect, useState } from 'react';
import { formApi } from './api';

/**
 * Client-side RBAC mirror. Resolves the caller's role from /api/forms/status and
 * exposes the seven named form permissions as booleans. Server routes remain the
 * source of truth; this only drives UI affordances. Matches the role tiers in
 * src/lib/form-builder/permissions.ts.
 */
export interface FormPermissions {
  loading: boolean;
  installed: boolean;
  enabled: boolean;
  role: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canViewSubmissions: boolean;
  canViewAnalytics: boolean;
}

const READ_ROLES = ['Owner', 'Admin', 'Editor'];
const WRITE_ROLES = ['Owner', 'Admin'];

export function useFormPermissions(): FormPermissions {
  const [state, setState] = useState({ loading: true, installed: false, enabled: false, role: 'Viewer' });

  useEffect(() => {
    let active = true;
    formApi
      .status()
      .then((s) => active && setState({ loading: false, installed: s.installed, enabled: s.enabled, role: s.role }))
      .catch(() => active && setState({ loading: false, installed: false, enabled: false, role: 'Viewer' }));
    return () => {
      active = false;
    };
  }, []);

  const read = READ_ROLES.includes(state.role);
  const write = WRITE_ROLES.includes(state.role);

  return {
    loading: state.loading,
    installed: state.installed,
    enabled: state.enabled,
    role: state.role,
    canView: read,
    canCreate: write,
    canEdit: write,
    canDelete: write,
    canPublish: write,
    canViewSubmissions: read,
    canViewAnalytics: read,
  };
}
