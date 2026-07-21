import { createEmptyRegistry } from './createEmptyRegistry';
import type {
  BlockRegistrationInput,
  BreakpointRegistrationInput,
  CommandRegistrationInput,
  EditorPluginRegistrationInput,
  FieldTypeRegistrationInput,
  InspectorPanelRegistrationInput,
  MiddlewareRegistrationInput,
  PreviewRegistrationInput,
  ProviderRegistrationInput,
  RegisteredAsset,
  RegisteredBlock,
  RegisteredHook,
  RegisteredMiddleware,
  RegisteredPartial,
  RegisteredTemplate,
  ServiceRegistrationInput,
  ShortcutRegistrationInput,
  ThemeDefinition,
  ThemeHookHandler,
  ThemeHookName,
  ThemeRegistrationContext as IThemeRegistrationContext,
  ThemeSettingRegistrationInput,
  ToolbarButtonRegistrationInput,
  ValidatorRegistrationInput,
} from './types';
import type { ThemeManifestMenu, ThemeManifestPartials, ThemeManifestWidgetArea } from '../types';

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function ensureTsx(path: string): string {
  const n = normalizePath(path);
  if (n.endsWith('.tsx')) return n;
  if (n.endsWith('.ts')) return `${n.slice(0, -3)}.tsx`;
  return `${n}.tsx`;
}

function ensureTs(path: string): string {
  const n = normalizePath(path);
  if (n.endsWith('.ts')) return n;
  return `${n}.ts`;
}

export class ThemeRegistrationContext implements IThemeRegistrationContext {
  private readonly registry = createEmptyRegistry();

  registerTemplate(key: string, templatePath: string, component?: RegisteredTemplate['component']): void {
    this.registry.templates[key] = { key, path: ensureTsx(templatePath), component };
  }

  registerPartial(
    key: keyof ThemeManifestPartials,
    partialPath: string,
    component?: RegisteredPartial['component']
  ): void {
    this.registry.partials[key] = { key, path: ensureTsx(partialPath), component };
  }

  registerBlock(input: BlockRegistrationInput): void {
    const entry: RegisteredBlock = {
      type: input.type,
      label: input.label,
      renderer: input.renderer,
      schema: input.schema,
      rendererPath: input.rendererPath ? ensureTsx(input.rendererPath) : undefined,
      schemaPath: input.schemaPath ? ensureTs(input.schemaPath) : undefined,
    };
    if (!entry.rendererPath && !entry.renderer) {
      entry.rendererPath = `blocks/${capitalize(input.type)}/Renderer.tsx`;
    }
    this.registry.blocks[input.type] = entry;
  }

  registerMenu(input: ThemeManifestMenu): void {
    this.registry.menus[input.key] = input;
  }

  registerWidgetArea(input: ThemeManifestWidgetArea): void {
    this.registry.widgetAreas[input.key] = input;
  }

  registerThemeSetting(input: ThemeSettingRegistrationInput): void {
    this.registry.settings[input.key] = {
      key: input.key,
      label: input.label ?? titleCase(input.key),
      type: input.type,
      default: input.default,
      options: input.options,
    };
  }

  registerEditorPlugin(input: EditorPluginRegistrationInput): void {
    this.registry.editorPlugins[input.id] = input;
  }

  registerInspectorPanel(input: InspectorPanelRegistrationInput): void {
    this.registry.inspectorPanels[input.id] = input;
  }

  registerToolbarButton(input: ToolbarButtonRegistrationInput): void {
    this.registry.toolbarButtons[input.id] = {
      id: input.id,
      icon: input.icon,
      label: input.label,
      action: input.action ?? (() => undefined),
      command: input.command,
    };
  }

  registerCommand(input: CommandRegistrationInput): void {
    this.registry.commands[input.id] = input;
  }

  registerShortcut(input: ShortcutRegistrationInput): void {
    this.registry.shortcuts[input.keys] = input;
  }

  registerHook(name: ThemeHookName, handler: ThemeHookHandler, priority?: number): void {
    const hook: RegisteredHook = { name, handler, priority };
    this.registry.hooks.push(hook);
    this.registry.hooks.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  registerMiddleware(input: MiddlewareRegistrationInput): void {
    const entry: RegisteredMiddleware = {
      id: input.id ?? `middleware-${this.registry.middleware.length + 1}`,
      handler: input.handler,
      priority: input.priority,
    };
    this.registry.middleware.push(entry);
    this.registry.middleware.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  registerProvider(input: ProviderRegistrationInput): void {
    this.registry.providers[input.id] = input;
  }

  registerValidator(input: ValidatorRegistrationInput): void {
    this.registry.validators[input.id] = input;
  }

  registerPreview(input: PreviewRegistrationInput): void {
    this.registry.previews[input.id] = input;
  }

  registerFieldType(input: FieldTypeRegistrationInput): void {
    this.registry.fieldTypes[input.id] = input;
  }

  registerBreakpoint(input: BreakpointRegistrationInput): void {
    this.registry.breakpoints[input.id] = input;
  }

  registerService(input: ServiceRegistrationInput): void {
    this.registry.services[input.id] = input;
  }

  registerStyle(relativePath: string): void {
    this.pushAsset('style', relativePath);
  }

  registerScript(relativePath: string): void {
    this.pushAsset('script', relativePath);
  }

  registerFont(relativePath: string): void {
    this.pushAsset('font', relativePath);
  }

  onInstall(handler: ThemeHookHandler): void {
    this.registerHook('install', handler);
  }

  onActivate(handler: ThemeHookHandler): void {
    this.registerHook('activate', handler);
  }

  onDeactivate(handler: ThemeHookHandler): void {
    this.registerHook('deactivate', handler);
  }

  onUpgrade(handler: ThemeHookHandler): void {
    this.registerHook('upgrade', handler);
  }

  onRender(handler: ThemeHookHandler): void {
    this.registerHook('render', handler);
  }

  onDestroy(handler: ThemeHookHandler): void {
    this.registerHook('destroy', handler);
  }

  beforeRender(handler: ThemeHookHandler): void {
    this.registerHook('beforeRender', handler);
  }

  afterRender(handler: ThemeHookHandler): void {
    this.registerHook('afterRender', handler);
  }

  beforeSave(handler: ThemeHookHandler): void {
    this.registerHook('beforeSave', handler);
  }

  afterSave(handler: ThemeHookHandler): void {
    this.registerHook('afterSave', handler);
  }

  beforePublish(handler: ThemeHookHandler): void {
    this.registerHook('beforePublish', handler);
  }

  afterPublish(handler: ThemeHookHandler): void {
    this.registerHook('afterPublish', handler);
  }

  getRegistry() {
    return this.registry;
  }

  toDefinition(): ThemeDefinition {
    return { registry: this.registry };
  }

  private pushAsset(kind: RegisteredAsset['kind'], relativePath: string): void {
    this.registry.assets.push({ kind, path: normalizePath(relativePath) });
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function titleCase(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
