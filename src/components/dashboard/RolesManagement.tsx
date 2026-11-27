'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Loader2,
  Lock,
  PlusCircle,
  RefreshCw,
  Shield,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  Puzzle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CAPABILITY_LABELS,
  getMaxCapabilitiesForBaseRole,
  type Capability,
} from '@/lib/rbac/capabilityDefinitions';
import {
  getDefaultEditorComponentsForBaseRole,
  getMaxEditorComponentsForBaseRole,
} from '@/lib/rbac/editorComponentDefinitions';
import { ROLE } from '@/lib/rbac/roles';

interface RoleEntry {
  name: string;
  value: number;
  type: 'system' | 'custom' | 'plugin';
  baseRole: number;
  capabilities: Capability[];
  allowedComponents: string[];
  allowedPlugins: string[];
  pluginPageAccess?: PluginPageAccessEntry[];
  editable: boolean;
  pluginId?: string;
}

interface PermissionModule {
  id: string;
  label: string;
  description: string;
  capabilities: Capability[];
}

interface EditorComponentGroup {
  group: string;
  items: Array<{ id: string; label: string; group: string }>;
}

interface PluginOption {
  pluginId: string;
  name: string;
  icon?: string;
  kind?: string;
  source?: string;
  permissions: string[];
  featureCatalog: {
    pages: Array<{
      id: string;
      label: string;
      features: Array<{ id: string; label: string }>;
    }>;
    permissions: Array<{ id: string; label: string }>;
  };
}

interface PluginPageAccessEntry {
  pluginId: string;
  pages: Array<{ id: string; features: string[] | '*' }>;
  permissions?: string[];
}

interface RoleFormState {
  name: string;
  capabilities: Capability[];
  allowedComponents: string[];
  allowedPlugins: string[];
  pluginPageAccess: PluginPageAccessEntry[];
}

const EMPTY_FORM: RoleFormState = {
  name: '',
  capabilities: ['dashboard.view', 'profile.edit'],
  allowedComponents: getDefaultEditorComponentsForBaseRole(ROLE.ADMIN),
  allowedPlugins: [],
  pluginPageAccess: [],
};

function defaultAccessForPlugin(plugin: PluginOption): PluginPageAccessEntry {
  const pages =
    plugin.featureCatalog.pages.length > 0
      ? plugin.featureCatalog.pages.map((page) => ({
          id: page.id,
          features:
            page.features.length > 0 ? page.features.map((f) => f.id) : ('*' as const),
        }))
      : [{ id: '*', features: '*' as const }];

  return {
    pluginId: plugin.pluginId,
    pages,
    permissions: plugin.featureCatalog.permissions.map((p) => p.id),
  };
}

function roleTypeBadge(type: RoleEntry['type']) {
  if (type === 'system') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Lock className="h-3 w-3" />
        Default
      </Badge>
    );
  }
  if (type === 'plugin') {
    return (
      <Badge variant="outline" className="gap-1">
        <Puzzle className="h-3 w-3" />
        Plugin
      </Badge>
    );
  }
  return (
    <Badge className="gap-1">
      <Shield className="h-3 w-3" />
      Custom
    </Badge>
  );
}

function moduleIsEnabled(module: PermissionModule, capabilities: Capability[]): boolean {
  const active = module.capabilities.filter((cap) => capabilities.includes(cap));
  return active.length > 0;
}

export default function RolesManagement({ onRolesChanged }: { onRolesChanged?: () => void }) {
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
  const [editorComponentGroups, setEditorComponentGroups] = useState<EditorComponentGroup[]>([]);
  const [plugins, setPlugins] = useState<PluginOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleEntry | null>(null);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    themes: true,
    plugins: true,
    settings: true,
    'ai-settings': true,
    'dashboard-components': true,
  });
  const [expandedPlugins, setExpandedPlugins] = useState<Record<string, boolean>>({});

  const allowedCapabilities = useMemo(
    () => new Set(getMaxCapabilitiesForBaseRole(ROLE.ADMIN)),
    []
  );

  const allowedEditorComponents = useMemo(
    () => new Set(getMaxEditorComponentsForBaseRole(ROLE.ADMIN)),
    []
  );

  const pluginsById = useMemo(() => {
    const map = new Map<string, PluginOption>();
    for (const plugin of plugins) map.set(plugin.pluginId, plugin);
    return map;
  }, [plugins]);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/custom-roles'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load roles');
      const data = await res.json();
      setRoles(data.roles || []);
      setPermissionModules(data.permissionModules || []);
      setEditorComponentGroups(data.editorComponentGroups || []);
      setPlugins(data.plugins || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreateDialog = () => {
    setEditingRole(null);
    const allIds = plugins.map((p) => p.pluginId);
    setForm({
      ...EMPTY_FORM,
      allowedPlugins: allIds,
      pluginPageAccess: plugins.map((p) => defaultAccessForPlugin(p)),
    });
    setExpandedPlugins({});
    setDialogOpen(true);
  };

  const openEditDialog = (role: RoleEntry) => {
    setEditingRole(role);
    const allowed = [...role.allowedPlugins];
    const existingAccess = role.pluginPageAccess || [];
    const accessById = new Map(existingAccess.map((entry) => [entry.pluginId, entry]));
    const pluginPageAccess = allowed.map((pluginId) => {
      const existing = accessById.get(pluginId);
      if (existing) return existing;
      const plugin = pluginsById.get(pluginId);
      return plugin
        ? defaultAccessForPlugin(plugin)
        : { pluginId, pages: [{ id: '*', features: '*' as const }] };
    });
    setForm({
      name: role.name,
      capabilities: [...role.capabilities],
      allowedComponents: [...role.allowedComponents],
      allowedPlugins: allowed,
      pluginPageAccess,
    });
    setExpandedPlugins({});
    setDialogOpen(true);
  };

  const toggleCapability = (cap: Capability) => {
    setForm((prev) => {
      const has = prev.capabilities.includes(cap);
      const capabilities = has
        ? prev.capabilities.filter((item) => item !== cap)
        : [...prev.capabilities, cap];
      return { ...prev, capabilities };
    });
  };

  const toggleModule = (module: PermissionModule, enabled: boolean) => {
    setForm((prev) => {
      const moduleCaps = module.capabilities.filter((cap) => allowedCapabilities.has(cap));
      if (enabled) {
        const merged = new Set([...prev.capabilities, ...moduleCaps]);
        return { ...prev, capabilities: [...merged] };
      }
      return {
        ...prev,
        capabilities: prev.capabilities.filter((cap) => !moduleCaps.includes(cap)),
      };
    });
  };

  const toggleEditorComponent = (componentId: string) => {
    setForm((prev) => {
      const has = prev.allowedComponents.includes(componentId);
      const allowedComponents = has
        ? prev.allowedComponents.filter((id) => id !== componentId)
        : [...prev.allowedComponents, componentId];
      return { ...prev, allowedComponents };
    });
  };

  const toggleAllowedPlugin = (pluginId: string) => {
    setForm((prev) => {
      const has = prev.allowedPlugins.includes(pluginId);
      if (has) {
        return {
          ...prev,
          allowedPlugins: prev.allowedPlugins.filter((id) => id !== pluginId),
          pluginPageAccess: prev.pluginPageAccess.filter((entry) => entry.pluginId !== pluginId),
        };
      }
      const plugin = pluginsById.get(pluginId);
      const nextAccess = plugin
        ? defaultAccessForPlugin(plugin)
        : { pluginId, pages: [{ id: '*', features: '*' as const }] };
      return {
        ...prev,
        allowedPlugins: [...prev.allowedPlugins, pluginId],
        pluginPageAccess: [
          ...prev.pluginPageAccess.filter((entry) => entry.pluginId !== pluginId),
          nextAccess,
        ],
      };
    });
    setExpandedPlugins((prev) => ({ ...prev, [pluginId]: true }));
  };

  const getPluginAccess = (pluginId: string): PluginPageAccessEntry | undefined =>
    form.pluginPageAccess.find((entry) => entry.pluginId === pluginId);

  const updatePluginAccess = (
    pluginId: string,
    updater: (current: PluginPageAccessEntry) => PluginPageAccessEntry
  ) => {
    setForm((prev) => {
      const plugin = pluginsById.get(pluginId);
      const current =
        prev.pluginPageAccess.find((entry) => entry.pluginId === pluginId) ||
        (plugin
          ? defaultAccessForPlugin(plugin)
          : { pluginId, pages: [{ id: '*', features: '*' as const }] });
      const next = updater(current);
      return {
        ...prev,
        pluginPageAccess: [
          ...prev.pluginPageAccess.filter((entry) => entry.pluginId !== pluginId),
          next,
        ],
      };
    });
  };

  const togglePluginPermission = (pluginId: string, permissionId: string) => {
    updatePluginAccess(pluginId, (current) => {
      const plugin = pluginsById.get(pluginId);
      const all = plugin?.featureCatalog.permissions.map((p) => p.id) || [];
      const selected = new Set(current.permissions ?? all);
      if (selected.has(permissionId)) selected.delete(permissionId);
      else selected.add(permissionId);
      return { ...current, permissions: [...selected] };
    });
  };

  const togglePluginPage = (pluginId: string, pageId: string, enabled: boolean) => {
    updatePluginAccess(pluginId, (current) => {
      const plugin = pluginsById.get(pluginId);
      const catalogPage = plugin?.featureCatalog.pages.find((p) => p.id === pageId);
      const withoutStar = current.pages.filter((p) => p.id !== '*');
      if (!enabled) {
        return {
          ...current,
          pages: withoutStar.filter((p) => p.id !== pageId),
        };
      }
      const existing = withoutStar.find((p) => p.id === pageId);
      if (existing) return { ...current, pages: withoutStar };
      return {
        ...current,
        pages: [
          ...withoutStar,
          {
            id: pageId,
            features:
              catalogPage && catalogPage.features.length > 0
                ? catalogPage.features.map((f) => f.id)
                : ('*' as const),
          },
        ],
      };
    });
  };

  const togglePluginPageFeature = (pluginId: string, pageId: string, featureId: string) => {
    updatePluginAccess(pluginId, (current) => {
      const plugin = pluginsById.get(pluginId);
      const catalogPage = plugin?.featureCatalog.pages.find((p) => p.id === pageId);
      const allFeatures = catalogPage?.features.map((f) => f.id) || [];
      let pages = current.pages.filter((p) => p.id !== '*');
      let page = pages.find((p) => p.id === pageId);
      if (!page) {
        page = { id: pageId, features: [...allFeatures] };
        pages = [...pages, page];
      }
      const currentFeatures =
        page.features === '*' ? [...allFeatures] : [...(page.features as string[])];
      const nextFeatures = currentFeatures.includes(featureId)
        ? currentFeatures.filter((f) => f !== featureId)
        : [...currentFeatures, featureId];
      return {
        ...current,
        pages: pages.map((p) =>
          p.id === pageId
            ? {
                id: pageId,
                features:
                  allFeatures.length > 0 && nextFeatures.length === allFeatures.length
                    ? ('*' as const)
                    : nextFeatures,
              }
            : p
        ),
      };
    });
  };

  const isPluginPageEnabled = (pluginId: string, pageId: string) => {
    const access = getPluginAccess(pluginId);
    if (!access) return false;
    if (access.pages.some((p) => p.id === '*')) return true;
    return access.pages.some((p) => p.id === pageId);
  };

  const isPluginFeatureEnabled = (pluginId: string, pageId: string, featureId: string) => {
    const access = getPluginAccess(pluginId);
    if (!access) return false;
    if (access.pages.some((p) => p.id === '*')) return true;
    const page = access.pages.find((p) => p.id === pageId);
    if (!page) return false;
    if (page.features === '*') return true;
    return page.features.includes(featureId);
  };

  const isPluginPermissionEnabled = (pluginId: string, permissionId: string) => {
    const access = getPluginAccess(pluginId);
    if (!access) return false;
    if (access.permissions === undefined) return true;
    return access.permissions.includes(permissionId);
  };

  const toggleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.capabilities.length === 0) {
      toast.error('Select at least one module or permission');
      return;
    }
    if (form.allowedComponents.length === 0) {
      toast.error('Select at least one editor component');
      return;
    }
    setIsSaving(true);
    try {
      const url = editingRole
        ? apiUrl(`/api/custom-roles/${editingRole.value}`)
        : apiUrl('/api/custom-roles');
      const res = await fetch(url, {
        method: editingRole ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to save role');
      }
      toast.success(editingRole ? 'Role updated' : 'Role created');
      setDialogOpen(false);
      await fetchRoles();
      onRolesChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (role: RoleEntry) => {
    if (!window.confirm(`Delete role "${role.name}"? Users with this role will become Authors.`)) {
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/custom-roles/${role.value}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to delete role');
      toast.success('Role deleted');
      await fetchRoles();
      onRolesChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete role');
    }
  };

  const systemRoles = roles.filter((role) => role.type === 'system');
  const customRoles = roles.filter((role) => role.type === 'custom');
  const pluginRoles = roles.filter((role) => role.type === 'plugin');

  const priorityModules = ['themes', 'plugins', 'settings', 'ai-settings', 'dashboard-components'];
  const sortedModules = [...permissionModules].sort((a, b) => {
    const ai = priorityModules.indexOf(a.id);
    const bi = priorityModules.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Role Management
              </CardTitle>
              <CardDescription className="mt-1">
                Create custom roles, choose dashboard modules (Themes, Plugins, Settings, AI
                Settings), and pick which editor components users can add.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchRoles} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={openCreateDialog}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Custom Role
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading roles...
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Default Roles (read-only)
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {systemRoles.map((role) => (
                    <RoleCard key={role.value} role={role} />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Puzzle className="h-4 w-4" />
                  Plugin Roles (from api/roles.js)
                </h3>
                {pluginRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground border rounded-lg p-4">
                    No plugin-defined roles yet. Upload a plugin that includes{' '}
                    <code className="text-xs">api/roles.js</code>, then they appear here and in the
                    Users role dropdown.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pluginRoles.map((role) => (
                      <RoleCard key={role.value} role={role} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Custom Roles
                </h3>
                {customRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground border rounded-lg p-4">
                    No custom roles yet. Click &quot;Add Custom Role&quot; to create one.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {customRoles.map((role) => (
                      <RoleCard
                        key={role.value}
                        role={role}
                        actions={
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(role)}>
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(role)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Custom Role' : 'Create Custom Role'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Content Manager"
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Dashboard modules &amp; access</Label>
              <p className="text-xs text-muted-foreground">
                Turn modules on/off, then expand to fine-tune permissions within each module.
              </p>
              <div className="space-y-2">
                {sortedModules.map((module) => {
                  const moduleCaps = module.capabilities.filter((cap) =>
                    allowedCapabilities.has(cap)
                  );
                  if (moduleCaps.length === 0) return null;
                  const enabled = moduleIsEnabled(module, form.capabilities);
                  const expanded = expandedModules[module.id] ?? false;
                  return (
                    <div key={module.id} className="rounded-lg border">
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            type="button"
                            className="mt-0.5 text-muted-foreground hover:text-foreground"
                            onClick={() => toggleExpanded(module.id)}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <div>
                            <p className="font-medium text-sm">{module.label}</p>
                            <p className="text-xs text-muted-foreground">{module.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => toggleModule(module, checked)}
                        />
                      </div>
                      {expanded && enabled ? (
                        <div className="border-t px-3 py-3 grid gap-2 sm:grid-cols-2">
                          {moduleCaps.map((cap) => (
                            <label
                              key={cap}
                              className="flex items-start gap-2 text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={form.capabilities.includes(cap)}
                                onChange={() => toggleCapability(cap)}
                              />
                              <span>{CAPABILITY_LABELS[cap]}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Editor components</Label>
              <p className="text-xs text-muted-foreground">
                Choose which blog/content blocks users with this role can add in the editor.
              </p>
              {editorComponentGroups.map(({ group, items }) => {
                const visible = items.filter((item) => allowedEditorComponents.has(item.id));
                if (visible.length === 0) return null;
                return (
                  <div key={group} className="rounded-lg border p-3">
                    <p className="text-sm font-medium mb-2">{group}</p>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {visible.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-start gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={form.allowedComponents.includes(item.id)}
                            onChange={() => toggleEditorComponent(item.id)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <Label>Plugins</Label>
              <p className="text-xs text-muted-foreground">
                Allow a plugin for this role, then choose which pages and features it may use.
                Features come from that plugin&apos;s <code>api/roles.js</code> catalog.
              </p>
              {plugins.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-lg p-3">
                  No active plugins installed yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {plugins.map((plugin) => {
                    const enabled = form.allowedPlugins.includes(plugin.pluginId);
                    const expanded = expandedPlugins[plugin.pluginId] ?? false;
                    const catalog = plugin.featureCatalog;
                    const hasPages = catalog.pages.length > 0;
                    const hasPermissions = catalog.permissions.length > 0;
                    const hasFeatures =
                      hasPages ||
                      hasPermissions ||
                      catalog.pages.some((page) => page.features.length > 0);

                    return (
                      <div key={plugin.pluginId} className="rounded-lg border">
                        <div className="flex items-center justify-between gap-3 p-3">
                          <div className="flex items-start gap-2 min-w-0">
                            {enabled && hasFeatures ? (
                              <button
                                type="button"
                                className="mt-0.5 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  setExpandedPlugins((prev) => ({
                                    ...prev,
                                    [plugin.pluginId]: !expanded,
                                  }))
                                }
                              >
                                {expanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="mt-0.5 w-4" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{plugin.name || plugin.pluginId}</p>
                              <p className="text-xs text-muted-foreground">{plugin.pluginId}</p>
                            </div>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => toggleAllowedPlugin(plugin.pluginId)}
                          />
                        </div>

                        {enabled && expanded && hasFeatures ? (
                          <div className="border-t px-3 py-3 space-y-4">
                            {hasPermissions ? (
                              <div className="space-y-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  API permissions
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {catalog.permissions.map((perm) => (
                                    <label
                                      key={perm.id}
                                      className="flex items-start gap-2 text-sm cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={isPluginPermissionEnabled(
                                          plugin.pluginId,
                                          perm.id
                                        )}
                                        onChange={() =>
                                          togglePluginPermission(plugin.pluginId, perm.id)
                                        }
                                      />
                                      <span>{perm.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {hasPages ? (
                              <div className="space-y-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Pages &amp; features
                                </p>
                                {catalog.pages.map((page) => {
                                  const pageOn = isPluginPageEnabled(plugin.pluginId, page.id);
                                  return (
                                    <div key={page.id} className="rounded-md border bg-muted/20 p-3">
                                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={pageOn}
                                          onChange={(e) =>
                                            togglePluginPage(
                                              plugin.pluginId,
                                              page.id,
                                              e.target.checked
                                            )
                                          }
                                        />
                                        <span>{page.label}</span>
                                      </label>
                                      {pageOn && page.features.length > 0 ? (
                                        <div className="mt-2 ml-6 grid gap-2 sm:grid-cols-2">
                                          {page.features.map((feature) => (
                                            <label
                                              key={feature.id}
                                              className="flex items-start gap-2 text-sm cursor-pointer"
                                            >
                                              <input
                                                type="checkbox"
                                                className="mt-0.5"
                                                checked={isPluginFeatureEnabled(
                                                  plugin.pluginId,
                                                  page.id,
                                                  feature.id
                                                )}
                                                onChange={() =>
                                                  togglePluginPageFeature(
                                                    plugin.pluginId,
                                                    page.id,
                                                    feature.id
                                                  )
                                                }
                                              />
                                              <span>{feature.label}</span>
                                            </label>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}

                            {!hasPages && !hasPermissions ? (
                              <p className="text-xs text-muted-foreground">
                                This plugin did not declare pages or permissions in{' '}
                                <code>api/roles.js</code>. Enabling it grants full access.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingRole ? (
                  'Save Changes'
                ) : (
                  'Create Role'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleCard({
  role,
  actions,
}: {
  role: RoleEntry;
  actions?: ReactNode;
}) {
  const moduleLabels = [
    role.capabilities.some((c) => c.startsWith('themes.')) ? 'Themes' : null,
    role.capabilities.some((c) => c.startsWith('plugins.')) ? 'Plugins' : null,
    role.capabilities.includes('settings.manage') ? 'Settings' : null,
    role.capabilities.includes('ai-settings.manage') ? 'AI Settings' : null,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold">{role.name}</h4>
            {roleTypeBadge(role.type)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {role.type === 'system'
              ? 'Built-in role — permissions are fixed in the CMS.'
              : role.type === 'plugin'
                ? `Defined by ${role.pluginId || 'a plugin'} in api/roles.js — assign it from Users.`
                : 'Custom role with selected module, plugin, and feature access.'}
          </p>
        </div>
        {actions ? <div className="flex gap-2 shrink-0">{actions}</div> : null}
      </div>
      {moduleLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {moduleLabels.map((label) => (
            <Badge key={label} variant="secondary" className="text-xs font-normal">
              {label}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {role.capabilities.slice(0, 6).map((cap) => (
          <Badge key={cap} variant="outline" className="text-xs font-normal">
            {CAPABILITY_LABELS[cap]}
          </Badge>
        ))}
        {role.capabilities.length > 6 ? (
          <Badge variant="outline" className="text-xs font-normal">
            +{role.capabilities.length - 6} permissions
          </Badge>
        ) : null}
      </div>
      {role.type === 'custom' && role.allowedComponents.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {role.allowedComponents.length} editor component
          {role.allowedComponents.length === 1 ? '' : 's'} allowed
        </p>
      ) : null}
      {role.type === 'custom' ? (
        <p className="text-xs text-muted-foreground">
          {role.allowedPlugins.length === 0
            ? 'No plugins allowed'
            : `${role.allowedPlugins.length} plugin${role.allowedPlugins.length === 1 ? '' : 's'} allowed${
                role.pluginPageAccess && role.pluginPageAccess.length > 0
                  ? ` · feature rules on ${role.pluginPageAccess.length}`
                  : ''
              }`}
        </p>
      ) : null}
    </div>
  );
}
