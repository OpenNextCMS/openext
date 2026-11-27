'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '@/lib/apiClient';
import type { Capability, NavSectionId } from '@/lib/rbac/capabilityDefinitions';

export interface RbacAccess {
  role: number;
  roleLabel: string;
  capabilities: Capability[];
  allowedEditorComponents: string[];
  allowedPluginIds: string[];
  nav: Record<string, boolean>;
  isAdmin: boolean;
  pluginUserType?: {
    pluginId: string;
    id: string;
    name: string;
    permissions: string[];
    pageAccess: Array<{ id: string; features: string[] | '*' }>;
  } | null;
  /** Custom + plugin role page/feature grants keyed by pluginId. */
  pluginAccessByPlugin?: Record<
    string,
    {
      pages: Array<{ id: string; features: string[] | '*' }>;
      permissions?: string[];
    }
  >;
}

function pagesForPlugin(
  access: RbacAccess | null,
  pluginId: string
): Array<{ id: string; features: string[] | '*' }> | null {
  if (!access) return null;
  const fromMap = access.pluginAccessByPlugin?.[pluginId];
  if (fromMap?.pages) return fromMap.pages;
  if (access.pluginUserType?.pluginId === pluginId) {
    return access.pluginUserType.pageAccess || [];
  }
  return null;
}

export function useRbac() {
  const [access, setAccess] = useState<RbacAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(apiUrl('/api/rbac/access'), { credentials: 'include' });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.message || 'Failed to load access');
        if (!cancelled) {
          setAccess(payload.data ?? payload);
        }
      } catch {
        if (!cancelled) setAccess(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const can = useCallback(
    (capability: Capability) => {
      return access?.capabilities?.includes(capability) ?? false;
    },
    [access]
  );

  const canNav = useCallback(
    (section: NavSectionId) => {
      return access?.nav?.[section] ?? false;
    },
    [access]
  );

  const canUseEditorComponent = useCallback(
    (componentId: string) => {
      return access?.allowedEditorComponents?.includes(componentId) ?? true;
    },
    [access]
  );

  const canUsePlugin = useCallback(
    (pluginId: string) => {
      return access?.allowedPluginIds?.includes(pluginId) ?? true;
    },
    [access]
  );

  const canAccessPluginPage = useCallback(
    (pluginId: string, pageId?: string) => {
      if (!canUsePlugin(pluginId)) return false;
      const pages = pagesForPlugin(access, pluginId);
      if (!pages) return true;
      if (pages.some((p) => p.id === '*')) return true;
      if (!pageId) return pages.length > 0;
      return pages.some((p) => p.id === pageId);
    },
    [access, canUsePlugin]
  );

  const getPluginPageFeatures = useCallback(
    (pluginId: string, pageId?: string): string[] | '*' => {
      if (!canUsePlugin(pluginId)) return [];
      const pages = pagesForPlugin(access, pluginId);
      if (!pages) return '*';
      if (pages.some((p) => p.id === '*')) return '*';
      if (!pageId) {
        if (pages.length === 1) return pages[0].features;
        return '*';
      }
      const match = pages.find((p) => p.id === pageId);
      if (!match) return [];
      return match.features;
    },
    [access, canUsePlugin]
  );

  return {
    access,
    loading,
    can,
    canNav,
    canUseEditorComponent,
    canUsePlugin,
    canAccessPluginPage,
    getPluginPageFeatures,
  };
}
