'use client';

import { useEffect, useState } from 'react';
import type { MenuRedirectRole } from '@/types/menu-redirect';

interface Access {
  role: MenuRedirectRole;
  canRead: boolean;
  canEdit: boolean;
  canManageLifecycle: boolean;
}

/** Client hook exposing the current user's Menu Redirect capabilities. */
export function useCanEditMappings() {
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/menu-redirect/access')
      .then((r) => r.json())
      .then((res) => res?.data && setAccess(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return {
    loading,
    role: access?.role ?? 'Viewer',
    canRead: access?.canRead ?? false,
    canEdit: access?.canEdit ?? false,
    canManageLifecycle: access?.canManageLifecycle ?? false,
  };
}
