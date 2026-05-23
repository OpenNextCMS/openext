'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pluginRegistry } from '@/lib/pluginRegistry';
import * as Library from '@/components/plugins/PluginComponents';
import { ContactUI } from '@/components/ui/ContactUI';

interface PluginContextType {
  isLoaded: boolean;
  activePlugins: any[];
  refreshPlugins: () => Promise<void>;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activePlugins, setActivePlugins] = useState<any[]>([]);

  const loadPlugins = async () => {
    try {
      const response = await fetch('/api/dashboard/plugins/get-plugins');
      const data = await response.json();

      if (response.ok) {
        const plugins = data.plugins || [];
        const activeOnes = plugins.filter((p: any) => p.isActive);

        // Clear registry before re-registering
        pluginRegistry.clear();

        for (const plugin of activeOnes) {
          // Determine which component to use from our Library
          let Component: React.ComponentType<any> = Library.GenericPlugin;

          // Map by type (for marketplace installs) or by name (for existing ones)
          const pluginType = (plugin.type || '').toLowerCase();
          const pluginName = plugin.name.toLowerCase();

          if (
            pluginType === 'chart' ||
            pluginName.includes('visualizer') ||
            pluginName.includes('analytics')
          ) {
            Component = Library.ChartPlugin;
          } else if (pluginType === 'social' || pluginName.includes('social')) {
            Component = Library.SocialPlugin;
          } else if (pluginType === 'form' || pluginName.includes('form')) {
            Component = Library.FormPlugin;
          } else if (pluginType === 'menu' || pluginName.includes('menu')) {
            Component = Library.MenuPlugin;
          } else if (pluginType === 'contact' || pluginName.includes('contact')) {
            Component = ContactUI;
          } else if (
            pluginType === 'slider' ||
            pluginName.includes('slider') ||
            pluginName.includes('casarole')
          ) {
            Component = Library.SliderPlugin;
          } else if (pluginName.includes('video') || pluginName.includes('content editor')) {
            Component = Library.VideoPlugin;
          } else if (pluginName.includes('seo')) {
            Component = Library.SeoPlugin;
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
