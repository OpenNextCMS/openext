'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PluginState } from '@/types/menu-redirect';

type LifecycleAction = 'install' | 'enable' | 'disable' | 'uninstall';

/**
 * Client hook for the Menu Redirect lifecycle gate. Reads /lifecycle/status and
 * exposes install/enable/disable/uninstall actions that refresh state.
 */
export function usePluginState() {
  const [state, setState] = useState<PluginState | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<LifecycleAction | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/menu-redirect/lifecycle/status');
      const json = await res.json();
      setState(json?.data ?? { installed: false, enabled: false });
    } catch {
      setState({ installed: false, enabled: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const act = useCallback(
    async (action: LifecycleAction) => {
      setActing(action);
      try {
        const res = await fetch(`/api/menu-redirect/lifecycle/${action}`, {
          method: 'POST',
          credentials: 'include',
        });
        await refresh();
        return res.ok;
      } finally {
        setActing(null);
      }
    },
    [refresh]
  );

  return {
    state,
    loading,
    acting,
    refresh,
    install: () => act('install'),
    enable: () => act('enable'),
    disable: () => act('disable'),
    uninstall: () => act('uninstall'),
  };
}
