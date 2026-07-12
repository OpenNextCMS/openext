'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BlockRendererProps } from '@/types/index';

interface UploadedPluginMeta {
  pluginId: string;
  name?: string;
  icon?: string;
  entryPoint?: string;
  customElement?: string;
  styles?: string[];
}

interface ExternalPluginBlockProps extends BlockRendererProps {
  plugin?: UploadedPluginMeta;
}

declare global {
  interface Window {
    __NEXTCMS_PLUGINS__?: Record<
      string,
      {
        mount?: (element: HTMLElement, context: { block: unknown; isEditing: boolean }) => void;
        unmount?: (element: HTMLElement) => void;
      }
    >;
  }
}

const loadedScripts = new Set<string>();
const loadedStyles = new Set<string>();
const scriptPromises = new Map<string, Promise<void>>();

function loadStyle(href: string): Promise<void> {
  if (loadedStyles.has(href)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => {
      loadedStyles.add(href);
      resolve();
    };
    link.onerror = () => reject(new Error(`Failed to load plugin stylesheet: ${href}`));
    document.head.appendChild(link);
  });
}

function loadScript(src: string): Promise<void> {
  if (loadedScripts.has(src)) return Promise.resolve();
  if (scriptPromises.has(src)) return scriptPromises.get(src)!;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load plugin script: ${src}`));
    document.body.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
}

export function ExternalPluginBlock({ block, isEditing = true, plugin }: ExternalPluginBlockProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const customElementRef = useRef<HTMLElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const pluginId = plugin?.pluginId || block.type;
  const entryPoint = plugin?.entryPoint;
  const customElement = plugin?.customElement;
  const styles = useMemo(() => plugin?.styles || [], [plugin?.styles]);
  const pluginData = (block as { data?: Record<string, unknown> }).data;

  useEffect(() => {
    if (!entryPoint) {
      setLoadError('Plugin entry point is missing');
      return;
    }

    let cancelled = false;
    const mountElement = mountRef.current;

    const bootPlugin = async () => {
      try {
        await Promise.all(
          styles.map((href) =>
            loadStyle(href).catch((error) => {
              console.warn(error);
            })
          )
        );
        await loadScript(entryPoint);

        if (cancelled || !mountElement) return;

        const registryEntry = window.__NEXTCMS_PLUGINS__?.[pluginId];
        if (registryEntry?.mount) {
          registryEntry.mount(mountElement, { block, isEditing });
        } else if (customElement) {
          const element = document.createElement(customElement);
          element.setAttribute('data-block-id', block.id || block.uniqueId || '');
          element.setAttribute('data-plugin-id', pluginId);
          element.setAttribute('data-editing', isEditing ? 'true' : 'false');

          if (typeof pluginData === 'object' && pluginData) {
            Object.entries(pluginData).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                element.setAttribute(`data-${key}`, String(value));
              }
            });
          }

          mountElement.innerHTML = '';
          mountElement.appendChild(element);
          customElementRef.current = element;
        }

        setIsReady(true);
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Failed to load plugin assets';
          setLoadError(message);
        }
      }
    };

    bootPlugin();

    return () => {
      cancelled = true;
      const registryEntry = window.__NEXTCMS_PLUGINS__?.[pluginId];
      if (registryEntry?.unmount && mountElement) {
        registryEntry.unmount(mountElement);
      }
      customElementRef.current = null;
    };
  }, [block, customElement, entryPoint, isEditing, pluginData, pluginId, styles]);

  if (loadError) {
    return (
      <div className="p-6 border border-destructive/30 bg-destructive/5 rounded-xl text-sm text-destructive">
        <p className="font-semibold mb-1">{plugin?.name || 'Uploaded Plugin'}</p>
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={mountRef}
        data-block-id={block.id || block.uniqueId || ''}
        data-plugin-id={pluginId}
        data-editing={isEditing ? 'true' : 'false'}
        className="w-full"
      />

      {!isReady && (
        <div className="p-8 bg-muted/20 border-2 border-dashed border-muted rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-3">{plugin?.icon || '🧩'}</span>
          <h3 className="text-lg font-semibold">{plugin?.name || 'Uploaded Plugin'}</h3>
          <p className="text-sm text-muted-foreground mt-2">Loading plugin assets...</p>
        </div>
      )}
    </div>
  );
}
