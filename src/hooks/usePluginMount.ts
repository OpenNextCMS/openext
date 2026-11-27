'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildPluginMountContext,
  injectPluginScopedStyles,
  invokeUnmount,
  loadPluginMountModule,
  type PluginMountModule,
  type PluginMountResult,
} from '@/lib/plugins/mountRuntime';

export interface UsePluginMountOptions {
  /** Absolute or assetUrl-ready module URL. Empty skips mount. */
  moduleUrl: string;
  pluginId: string;
  pageId?: string;
  roleId?: string;
  features: string[] | '*';
  extensionId?: string;
  /** Extra stylesheets to inject while mounted (manifest.styles public paths). */
  styleUrls?: string[];
}

/**
 * Mounts a plugin/extension ESM module into the element attached via `containerRef`.
 * Uses a callback ref so mount retries when the DOM node appears after loading gates.
 * Styles are injected under `@scope (#plugin-root)` so they cannot leak into the sidebar.
 */
export function usePluginMount(options: UsePluginMountOptions) {
  const { moduleUrl, pluginId, pageId, roleId, features, extensionId, styleUrls } = options;
  const featuresKey = features === '*' ? '*' : features.join(',');
  const styleKey = (styleUrls ?? []).join('|');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);

  const handleRef = useRef<PluginMountResult | undefined>(undefined);
  const modRef = useRef<PluginMountModule | undefined>(undefined);
  const styleNodesRef = useRef<HTMLStyleElement[]>([]);
  const generationRef = useRef(0);

  const containerRef = useCallback((node: HTMLElement | null) => {
    setContainerEl(node);
  }, []);

  useEffect(() => {
    const el = containerEl;
    if (!el || !moduleUrl || !pluginId) {
      setStatus('idle');
      setError(null);
      return;
    }

    const generation = ++generationRef.current;
    let cancelled = false;
    const styles = styleKey ? styleKey.split('|').filter(Boolean) : [];
    const featureList: string[] | '*' =
      featuresKey === '*' ? '*' : featuresKey ? featuresKey.split(',') : [];

    (async () => {
      setStatus('loading');
      setError(null);

      const prevHandle = handleRef.current;
      const prevMod = modRef.current;
      handleRef.current = undefined;
      modRef.current = undefined;
      await invokeUnmount(prevHandle, prevMod);
      if (cancelled || generation !== generationRef.current) return;

      el.replaceChildren();
      for (const node of styleNodesRef.current) {
        node.remove();
      }
      styleNodesRef.current = [];

      try {
        for (const href of styles) {
          const styleNode = await injectPluginScopedStyles(href, '#plugin-root');
          if (cancelled || generation !== generationRef.current) {
            styleNode.remove();
            return;
          }
          styleNodesRef.current.push(styleNode);
        }

        const mod = await loadPluginMountModule(moduleUrl);
        if (cancelled || generation !== generationRef.current) return;
        modRef.current = mod;
        const ctx = buildPluginMountContext({
          pluginId,
          pageId,
          roleId,
          features: featureList,
          extensionId,
        });
        const handle = await mod.mount(el, ctx);
        if (cancelled || generation !== generationRef.current) {
          await invokeUnmount(handle, mod);
          return;
        }
        handleRef.current = handle;
        setStatus('ready');
      } catch (err) {
        if (cancelled || generation !== generationRef.current) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load plugin mount module. Rebuild the plugin for the Mount API.';
        setError(message);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      const ownedHandle = handleRef.current;
      const ownedMod = modRef.current;
      const ownedStyles = styleNodesRef.current;
      handleRef.current = undefined;
      modRef.current = undefined;
      styleNodesRef.current = [];
      void (async () => {
        await invokeUnmount(ownedHandle, ownedMod);
        for (const node of ownedStyles) {
          node.remove();
        }
        if (generationRef.current === generation && el.isConnected) {
          el.replaceChildren();
        }
      })();
    };
  }, [containerEl, moduleUrl, pluginId, pageId, roleId, extensionId, featuresKey, styleKey]);

  return { containerRef, status, error };
}
