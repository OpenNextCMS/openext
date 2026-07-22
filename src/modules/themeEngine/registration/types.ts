import type {
  ThemeComponent,
  ThemeManifestBlock,
  ThemeManifestMenu,
  ThemeManifestPartials,
  ThemeManifestSetting,
  ThemeManifestTemplates,
  ThemeManifestWidgetArea,
  ThemeEditableSection,
  ThemeSectionFieldSchema,
} from '../types';

/* ------------------------------------------------------------------ *
 * Hook / lifecycle names
 * ------------------------------------------------------------------ */

export type ThemeHookName =
  | 'install'
  | 'activate'
  | 'deactivate'
  | 'upgrade'
  | 'render'
  | 'destroy'
  | 'beforeRender'
  | 'afterRender'
  | 'beforeSave'
  | 'afterSave'
  | 'beforePublish'
  | 'afterPublish';

export type ThemeLifecycleEvent = ThemeHookName;

export interface ThemeHookContext {
  slug: string;
  page?: { slug: string; type: string };
  user?: { id: string; role: string } | null;
  [key: string]: unknown;
}

export type ThemeHookHandler = (ctx: ThemeHookContext) => void | Promise<void>;

export interface ThemeMiddlewareContext extends ThemeHookContext {
  next: () => Promise<void>;
}

export type ThemeMiddlewareHandler = (
  ctx: ThemeMiddlewareContext
) => void | Promise<void>;

/* ------------------------------------------------------------------ *
 * Registration descriptors (stored in runtime registry)
 * ------------------------------------------------------------------ */

export interface RegisteredTemplate {
  key: string;
  path: string;
  component?: ThemeComponent;
}

export interface RegisteredPartial {
  key: keyof ThemeManifestPartials;
  path: string;
  component?: ThemeComponent;
}

export interface RegisteredBlock {
  type: string;
  rendererPath?: string;
  schemaPath?: string;
  renderer?: ThemeComponent;
  schema?: unknown;
  label?: string;
}

export interface RegisteredCommand {
  id: string;
  label?: string;
  execute: (ctx: ThemeHookContext) => void | Promise<void>;
}

export interface RegisteredToolbarButton {
  id: string;
  icon?: string;
  label: string;
  action: (ctx: ThemeHookContext) => void | Promise<void>;
  command?: string;
}

export interface RegisteredInspectorPanel {
  id: string;
  title: string;
  component: ThemeComponent;
}

export interface RegisteredShortcut {
  keys: string;
  command: string;
}

export interface RegisteredEditorPlugin {
  id: string;
  setup?: (ctx: ThemeHookContext) => void | Promise<void>;
}

export interface RegisteredProvider {
  id: string;
  create: () => unknown;
}

export interface RegisteredValidator {
  id: string;
  validate: (value: unknown, ctx: ThemeHookContext) => string | null | Promise<string | null>;
}

export interface RegisteredPreview {
  id: string;
  component: ThemeComponent;
}

export interface RegisteredFieldType {
  id: string;
  component: ThemeComponent;
}

export interface RegisteredBreakpoint {
  id: string;
  label: string;
  minWidth?: number;
  maxWidth?: number;
}

export interface RegisteredService {
  id: string;
  factory: () => unknown;
}

export interface RegisteredAsset {
  kind: 'style' | 'script' | 'font';
  path: string;
}

export interface RegisteredHook {
  name: ThemeHookName;
  handler: ThemeHookHandler;
  priority?: number;
}

export interface RegisteredMiddleware {
  id: string;
  handler: ThemeMiddlewareHandler;
  priority?: number;
}

/** Populated by executing theme.ts + auto-discovery. */
export interface ThemeRuntimeRegistry {
  templates: Record<string, RegisteredTemplate>;
  partials: Record<string, RegisteredPartial>;
  blocks: Record<string, RegisteredBlock>;
  menus: Record<string, ThemeManifestMenu>;
  widgetAreas: Record<string, ThemeManifestWidgetArea>;
  settings: Record<string, ThemeManifestSetting>;
  commands: Record<string, RegisteredCommand>;
  toolbarButtons: Record<string, RegisteredToolbarButton>;
  inspectorPanels: Record<string, RegisteredInspectorPanel>;
  shortcuts: Record<string, RegisteredShortcut>;
  editorPlugins: Record<string, RegisteredEditorPlugin>;
  providers: Record<string, RegisteredProvider>;
  validators: Record<string, RegisteredValidator>;
  previews: Record<string, RegisteredPreview>;
  fieldTypes: Record<string, RegisteredFieldType>;
  breakpoints: Record<string, RegisteredBreakpoint>;
  services: Record<string, RegisteredService>;
  hooks: RegisteredHook[];
  middleware: RegisteredMiddleware[];
  assets: RegisteredAsset[];
  editableSections: ThemeEditableSection[];
}

/** Result of `defineTheme()` — serializable paths + live component refs. */
export interface ThemeDefinition {
  registry: ThemeRuntimeRegistry;
}

export interface BlockRegistrationInput {
  type: string;
  renderer?: ThemeComponent;
  rendererPath?: string;
  schema?: unknown | ThemeSectionFieldSchema[];
  schemaPath?: string;
  label?: string;
}

export interface ThemeSettingRegistrationInput {
  key: string;
  label?: string;
  type: ThemeManifestSetting['type'];
  default: unknown;
  options?: string[];
}

export interface CommandRegistrationInput {
  id: string;
  label?: string;
  execute: (ctx: ThemeHookContext) => void | Promise<void>;
}

export interface ToolbarButtonRegistrationInput {
  id: string;
  icon?: string;
  label: string;
  action?: (ctx: ThemeHookContext) => void | Promise<void>;
  command?: string;
}

export interface InspectorPanelRegistrationInput {
  id: string;
  title: string;
  component: ThemeComponent;
}

export interface ShortcutRegistrationInput {
  keys: string;
  command: string;
}

export interface MiddlewareRegistrationInput {
  id?: string;
  handler: ThemeMiddlewareHandler;
  priority?: number;
}

export interface ProviderRegistrationInput {
  id: string;
  create: () => unknown;
}

export interface ValidatorRegistrationInput {
  id: string;
  validate: (value: unknown, ctx: ThemeHookContext) => string | null | Promise<string | null>;
}

export interface PreviewRegistrationInput {
  id: string;
  component: ThemeComponent;
}

export interface FieldTypeRegistrationInput {
  id: string;
  component: ThemeComponent;
}

export interface BreakpointRegistrationInput {
  id: string;
  label: string;
  minWidth?: number;
  maxWidth?: number;
}

export interface ServiceRegistrationInput {
  id: string;
  factory: () => unknown;
}

export interface EditorPluginRegistrationInput {
  id: string;
  setup?: (ctx: ThemeHookContext) => void | Promise<void>;
}

/** Internal manifest paths derived from registry (for ThemeLoader). */
export interface RegistryManifestPaths {
  templates: ThemeManifestTemplates;
  partials: ThemeManifestPartials;
  blocks: ThemeManifestBlock[];
  menus: ThemeManifestMenu[];
  widgetAreas: ThemeManifestWidgetArea[];
  themeSettings: ThemeManifestSetting[];
  editableSections: ThemeEditableSection[];
  assetStyles: string[];
  assetScripts: string[];
}

export type ThemeRegistrationCallback = (theme: ThemeRegistrationContext) => void;

/** Forward declaration — implemented in ThemeRegistrationContext.ts */
export interface ThemeRegistrationContext {
  registerTemplate(key: string, templatePath: string, component?: ThemeComponent): void;
  registerPartial(key: keyof ThemeManifestPartials, partialPath: string, component?: ThemeComponent): void;
  registerBlock(input: BlockRegistrationInput): void;
  registerMenu(input: ThemeManifestMenu): void;
  registerWidgetArea(input: ThemeManifestWidgetArea): void;
  registerThemeSetting(input: ThemeSettingRegistrationInput): void;
  registerEditorPlugin(input: EditorPluginRegistrationInput): void;
  registerInspectorPanel(input: InspectorPanelRegistrationInput): void;
  registerToolbarButton(input: ToolbarButtonRegistrationInput): void;
  registerCommand(input: CommandRegistrationInput): void;
  registerShortcut(input: ShortcutRegistrationInput): void;
  registerHook(name: ThemeHookName, handler: ThemeHookHandler, priority?: number): void;
  registerMiddleware(input: MiddlewareRegistrationInput): void;
  registerProvider(input: ProviderRegistrationInput): void;
  registerValidator(input: ValidatorRegistrationInput): void;
  registerPreview(input: PreviewRegistrationInput): void;
  registerFieldType(input: FieldTypeRegistrationInput): void;
  registerBreakpoint(input: BreakpointRegistrationInput): void;
  registerService(input: ServiceRegistrationInput): void;
  registerStyle(relativePath: string): void;
  registerScript(relativePath: string): void;
  registerFont(relativePath: string): void;
  onInstall(handler: ThemeHookHandler): void;
  onActivate(handler: ThemeHookHandler): void;
  onDeactivate(handler: ThemeHookHandler): void;
  onUpgrade(handler: ThemeHookHandler): void;
  onRender(handler: ThemeHookHandler): void;
  onDestroy(handler: ThemeHookHandler): void;
  beforeRender(handler: ThemeHookHandler): void;
  afterRender(handler: ThemeHookHandler): void;
  beforeSave(handler: ThemeHookHandler): void;
  afterSave(handler: ThemeHookHandler): void;
  beforePublish(handler: ThemeHookHandler): void;
  afterPublish(handler: ThemeHookHandler): void;
  getRegistry(): ThemeRuntimeRegistry;
}
