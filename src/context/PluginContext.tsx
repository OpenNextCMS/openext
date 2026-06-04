'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pluginRegistry } from '@/lib/pluginRegistry';
import * as Library from '@/components/plugins/PluginComponents';
import { ContactUI } from '@/components/ui/ContactUI';
import { sliderDefaultContentString } from '@/components/plugins/sliderSchema';

interface PluginRecord {
  pluginId: string;
  name: string;
  description?: string;
  icon?: string;
  type?: string;
  isActive?: boolean;
}

interface PluginContextType {
  isLoaded: boolean;
  activePlugins: PluginRecord[];
  refreshPlugins: () => Promise<void>;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activePlugins, setActivePlugins] = useState<PluginRecord[]>([]);

  const loadPlugins = async () => {
    try {
      const response = await fetch('/api/dashboard/plugins/get-plugins');
      const data = await response.json();

      if (response.ok) {
        const plugins = data.plugins || [];
        const activeOnes = plugins.filter((p: PluginRecord) => p.isActive);

        // Clear registry before re-registering
        pluginRegistry.clear();

        for (const plugin of activeOnes as PluginRecord[]) {
          // Determine which component to use from our Library
          let Component: React.ComponentType<Record<string, unknown>> = Library.GenericPlugin as unknown as React.ComponentType<Record<string, unknown>>;

          // Map by type (for marketplace installs) or by name (for existing ones)
          const pluginType = (plugin.type || '').toLowerCase();
          const pluginName = plugin.name.toLowerCase();
          const isSliderPlugin =
            pluginType === 'slider' ||
            pluginName.includes('slider') ||
            pluginName.includes('casarole');

          // Menu Redirect is a dashboard *system* (accessed via the sidebar),
          // not a placeable block. Skip registering it in the block registry so
          // it never appears in the editor's add-blocks panel. It stays in
          // `activePlugins`, which the dashboard sidebar uses to surface its nav.
          const isMenuRedirect =
            plugin.pluginId === 'menu-redirect' ||
            (pluginName.includes('menu') && pluginName.includes('redirect'));
          if (isMenuRedirect) continue;

          // Form Builder is likewise a dashboard *system* (sidebar nav + a
          // dedicated 'form-block' palette block). Skip the legacy mock-form
          // block registration so it isn't double-listed in the editor.
          const isFormBuilder =
            plugin.pluginId === 'form-builder' ||
            pluginType === 'form' ||
            (pluginName.includes('form') && pluginName.includes('builder'));
          if (isFormBuilder) continue;

          if (
            pluginType === 'chart' ||
            pluginName.includes('visualizer') ||
            pluginName.includes('analytics')
          ) {
            Component = Library.ChartPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (pluginType === 'social' || pluginName.includes('social')) {
            Component = Library.SocialPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (pluginType === 'form' || pluginName.includes('form')) {
            Component = Library.FormPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (pluginType === 'menu' || pluginName.includes('menu')) {
            Component = Library.MenuPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (pluginType === 'contact' || pluginName.includes('contact')) {
            Component = ContactUI as unknown as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (isSliderPlugin) {
            Component = Library.SliderPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (pluginName.includes('video') || pluginName.includes('content editor')) {
            Component = Library.VideoPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (pluginName.includes('seo')) {
            Component = Library.SeoPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          }

          pluginRegistry.register({
            id: plugin.pluginId,
            name: isSliderPlugin ? 'Slider' : plugin.name,
            type: 'block',
            component: (props) => <Component {...props} plugin={plugin} />,
            metadata: {
              icon: plugin.icon,
              description: isSliderPlugin
                ? 'Create banners, cards, products, and content sliders.'
                : plugin.description,
              defaultContent: isSliderPlugin ? sliderDefaultContentString : undefined,
              defaultStyle: isSliderPlugin ? { width: '100%' } : undefined,
              category: isSliderPlugin ? 'Interactive Components' : 'Plugin Blocks',
            },
          });
        }

        // Trigger re-render AFTER registration is complete
        setActivePlugins(activeOnes);
      }
    } catch (error) {
      console.error('Failed to load plugins in context:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  return (
    <PluginContext.Provider value={{ isLoaded, activePlugins, refreshPlugins: loadPlugins }}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (context === undefined) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
};
