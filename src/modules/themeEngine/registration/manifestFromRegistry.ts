import type {
  ThemeManifest,
  ThemeManifestBlock,
  ThemeManifestPartials,
  ThemeManifestTemplates,
} from '../types';
import type { RegistryManifestPaths, ThemeRuntimeRegistry } from './types';

/**
 * Merge a base manifest (theme.json metadata + legacy declarations) with a runtime registry.
 * Explicit registry entries win over manifest and auto-discovery.
 */
export function manifestFromRegistry(
  base: ThemeManifest,
  registry: ThemeRuntimeRegistry
): ThemeManifest {
  const paths = registryToManifestPaths(registry);

  const templates: ThemeManifestTemplates = { ...base.templates, ...paths.templates };
  if (!templates.index && paths.templates.index) {
    templates.index = paths.templates.index;
  }

  const partials: ThemeManifestPartials = { ...base.partials, ...paths.partials };

  const blockMap = new Map<string, ThemeManifestBlock>();
  for (const b of base.blocks ?? []) blockMap.set(b.type, b);
  for (const b of paths.blocks) blockMap.set(b.type, b);

  const menus = mergeByKey(base.menus, Object.values(registry.menus), (m) => m.key);
  const widgetAreas = mergeByKey(base.widgetAreas, Object.values(registry.widgetAreas), (w) => w.key);
  const themeSettings = mergeByKey(base.themeSettings, Object.values(registry.settings), (s) => s.key);

  return {
    ...base,
    templates,
    partials,
    menus,
    widgetAreas,
    themeSettings,
    blocks: blockMap.size > 0 ? [...blockMap.values()] : undefined,
    editableSections:
      registry.editableSections.length > 0
        ? registry.editableSections
        : base.editableSections,
  };
}

export function registryToManifestPaths(registry: ThemeRuntimeRegistry): RegistryManifestPaths {
  const templates: ThemeManifestTemplates = { index: registry.templates.index?.path ?? '' };
  for (const t of Object.values(registry.templates)) {
    if (t.key === 'index') templates.index = t.path;
    else templates[t.key] = t.path;
  }

  const partials: ThemeManifestPartials = {};
  for (const p of Object.values(registry.partials)) {
    partials[p.key] = p.path;
  }

  const blocks: ThemeManifestBlock[] = Object.values(registry.blocks)
    .filter((b) => b.rendererPath || b.renderer)
    .map((b) => ({
      type: b.type,
      rendererPath: b.rendererPath ?? `blocks/${b.type}/Renderer.tsx`,
      schemaPath: b.schemaPath,
    }));

  const assetStyles = registry.assets.filter((a) => a.kind === 'style').map((a) => a.path);
  const assetScripts = registry.assets.filter((a) => a.kind === 'script').map((a) => a.path);

  return {
    templates,
    partials,
    blocks,
    menus: Object.values(registry.menus),
    widgetAreas: Object.values(registry.widgetAreas),
    themeSettings: Object.values(registry.settings),
    editableSections: registry.editableSections,
    assetStyles,
    assetScripts,
  };
}

function mergeByKey<T>(base: T[], extra: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of base) map.set(keyFn(item), item);
  for (const item of extra) map.set(keyFn(item), item);
  return [...map.values()];
}

/** Deep-merge two registries; `override` wins on conflicts. */
export function mergeRegistries(
  base: ThemeRuntimeRegistry,
  override: ThemeRuntimeRegistry
): ThemeRuntimeRegistry {
  return {
    templates: { ...base.templates, ...override.templates },
    partials: { ...base.partials, ...override.partials },
    blocks: { ...base.blocks, ...override.blocks },
    menus: { ...base.menus, ...override.menus },
    widgetAreas: { ...base.widgetAreas, ...override.widgetAreas },
    settings: { ...base.settings, ...override.settings },
    commands: { ...base.commands, ...override.commands },
    toolbarButtons: { ...base.toolbarButtons, ...override.toolbarButtons },
    inspectorPanels: { ...base.inspectorPanels, ...override.inspectorPanels },
    shortcuts: { ...base.shortcuts, ...override.shortcuts },
    editorPlugins: { ...base.editorPlugins, ...override.editorPlugins },
    providers: { ...base.providers, ...override.providers },
    validators: { ...base.validators, ...override.validators },
    previews: { ...base.previews, ...override.previews },
    fieldTypes: { ...base.fieldTypes, ...override.fieldTypes },
    breakpoints: { ...base.breakpoints, ...override.breakpoints },
    services: { ...base.services, ...override.services },
    hooks: [...base.hooks, ...override.hooks].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
    middleware: [...base.middleware, ...override.middleware].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    ),
    assets: dedupeAssets([...base.assets, ...override.assets]),
    editableSections: override.editableSections.length > 0 ? override.editableSections : base.editableSections,
  };
}

function dedupeAssets(assets: ThemeRuntimeRegistry['assets']): ThemeRuntimeRegistry['assets'] {
  const seen = new Set<string>();
  return assets.filter((a) => {
    const key = `${a.kind}:${a.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
