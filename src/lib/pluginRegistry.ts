import React from 'react';

export interface PluginExtension {
  id: string;
  name: string;
  type: 'block' | 'toolbar' | 'widget';
  component: React.ComponentType<any>;
  metadata?: any;
}

class PluginRegistry {
  private extensions: Map<string, PluginExtension> = new Map();

  register(extension: PluginExtension) {
    this.extensions.set(extension.id, extension);
    console.log(`Plugin registered: ${extension.name} (${extension.id})`);
  }

  unregister(id: string) {
    this.extensions.delete(id);
  }

  clear() {
    this.extensions.clear();
  }

  getExtensionsByType(type: PluginExtension['type']) {
    return Array.from(this.extensions.values()).filter(ext => ext.type === type);
  }

  getExtension(id: string) {
    return this.extensions.get(id);
  }

  getAllExtensions() {
    return Array.from(this.extensions.values());
  }
}

export const pluginRegistry = new PluginRegistry();
