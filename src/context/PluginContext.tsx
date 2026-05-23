'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pluginRegistry } from '@/lib/pluginRegistry';
import * as Library from '@/components/plugins/PluginComponents';
import { ContactUI } from '@/components/ui/ContactUI';

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
          } else if (
            pluginType === 'slider' ||
            pluginName.includes('slider') ||
            pluginName.includes('casarole')
          ) {
            Component = Library.SliderPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (pluginName.includes('video') || pluginName.includes('content editor')) {
            Component = Library.VideoPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          } else if (pluginName.includes('seo')) {
            Component = Library.SeoPlugin as unknown as React.ComponentType<Record<string, unknown>>;
          }

          pluginRegistry.register({
            id: plugin.pluginId,
            name: plugin.name,
            type: 'block',
            component: (props) => <Component {...props} plugin={plugin} />,
            metadata: {
              icon: plugin.icon,
              description: plugin.description,
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
