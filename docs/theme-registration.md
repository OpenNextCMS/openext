# Theme Registration (`theme.ts`)

This document describes the **Theme Registration System** used by the Theme Engine (Beta).
Every uploaded theme exposes a single `theme.ts` entry point — similar to WordPress
`functions.php`, but strongly typed, React-first, and plugin-friendly.

For ZIP packaging, validation limits, and editable sections, see
[Theme Engine Upload Package Format](./theme-engine-editable-sections.md).

Token-based themes (JSON packages) are documented separately in
[Theme Uploading](./theme-upload-format.md).

---

## Design principles

1. Every theme has exactly one registration entry point (`theme.ts`).
2. `theme.json` contains **metadata only** — no business logic.
3. `theme.ts` contains all runtime registration logic.
4. Registration APIs are strongly typed.
5. Themes never modify CMS core code.
6. Plugins and themes share the same registration system (`definePlugin`).
7. The runtime builds a centralized registry from all registrations.
8. Folder-based auto-discovery reduces boilerplate; `theme.ts` can override defaults.
9. Theme behavior is driven through lifecycle hooks, services, commands, and registrations — not global side effects.

---

## Theme folder structure

```text
my-theme/
│
├── theme.json                Metadata only
├── theme.ts                  Registration entry point (required for new themes)
│
├── templates/
│   ├── Index.tsx             Required (index fallback)
│   ├── Home.tsx
│   ├── Page.tsx
│   └── Post.tsx
│
├── partials/
│   ├── Header.tsx
│   └── Footer.tsx
│
├── blocks/
│   ├── Hero/
│   │   ├── Renderer.tsx
│   │   └── schema.ts
│   └── Gallery/
│       ├── Renderer.tsx
│       └── schema.ts
│
├── editor/                   Optional editor extensions
│   ├── toolbar.ts
│   ├── inspector.ts
│   ├── shortcuts.ts
│   └── commands.ts
│
├── hooks/                    Optional lifecycle hooks
│   ├── beforeRender.ts
│   ├── afterRender.ts
│   ├── beforeSave.ts
│   └── afterSave.ts
│
├── middleware/               Optional runtime interceptors
├── providers/                Optional injectable services
│
├── assets/
│   ├── style.css
│   ├── theme.js
│   ├── images/
│   └── fonts/
│
└── locales/                  Optional (future)
```

---

## `theme.json` (metadata only)

Keep `theme.json` lightweight. It describes identity and compatibility — never business logic.

```json
{
  "name": "Coffee Theme",
  "slug": "coffee-theme",
  "version": "1.0.0",
  "author": "John Doe",
  "description": "A production website theme.",
  "compatibleCmsVersion": "^2.0.0",
  "entry": "theme.ts",
  "supportedFeatures": ["block-editor"]
}
```

| Field | Required | Description |
| --- | --- | --- |
| `name` | yes | 3–50 characters |
| `author` | yes | Non-empty string |
| `version` | yes | Semver, e.g. `1.0.0` |
| `compatibleCmsVersion` | yes | Semver range, e.g. `^2.0.0` |
| `entry` | recommended | Registration bootstrap file (default: `theme.ts`) |
| `slug` | no | Kebab-case; derived from `name` when omitted |
| `description` | no | Max 500 characters |
| `supportedFeatures` | no | Feature flags array |
| `editableSections` | no | Homepage section contract (see editable sections doc) |

When `"entry": "theme.ts"` is declared, you do **not** need to list templates, blocks,
partials, menus, or settings in `theme.json` — register them in `theme.ts` instead, or rely
on auto-discovery.

### Legacy manifest-only themes

Themes uploaded before the registration system may still declare everything directly in
`theme.json`:

```json
{
  "name": "Legacy Theme",
  "author": "Acme",
  "version": "1.0.0",
  "compatibleCmsVersion": "^2.0.0",
  "templates": {
    "index": "templates/Index.tsx"
  },
  "blocks": [
    {
      "type": "my-hero",
      "rendererPath": "blocks/Hero/Renderer.tsx",
      "schemaPath": "blocks/Hero/schema.ts"
    }
  ]
}
```

Legacy themes continue to work. Auto-discovery supplements missing declarations.

---

## `theme.ts` (bootstrap entry)

When the CMS loads a theme, it executes `theme.ts` **before** resolving templates and blocks.

### Author SDK

Import from `@cms/theme` (path alias in theme source; rewritten at runtime compile time):

```ts
import { defineTheme } from '@cms/theme';

export default defineTheme((theme) => {
  // All registrations happen inside this callback
});
```

Plugins use the same API via `definePlugin`:

```ts
import { definePlugin } from '@cms/theme';

export default definePlugin((plugin) => {
  plugin.registerCommand({ id: 'my-command', execute() {} });
});
```

---

## Registration API

Everything inside the `defineTheme` callback is the **registration phase**.

### Templates, partials, blocks

```ts
import { defineTheme } from '@cms/theme';

export default defineTheme((theme) => {
  theme.registerTemplate('index', './templates/Index');
  theme.registerTemplate('home', './templates/Home');

  theme.registerPartial('header', './partials/Header');
  theme.registerPartial('footer', './partials/Footer');

  theme.registerBlock({
    type: 'hero',
    rendererPath: './blocks/Hero/Renderer',
    schemaPath: './blocks/Hero/schema',
    label: 'Hero',
  });
});
```

You may pass live React components instead of paths when authoring inside the CMS monorepo:

```ts
import HeroRenderer from './blocks/Hero/Renderer';
import heroSchema from './blocks/Hero/schema';

theme.registerBlock({
  type: 'hero',
  renderer: HeroRenderer,
  schema: heroSchema,
});
```

Uploaded ZIP themes should use **paths only** — relative imports between theme files are not bundled.

### Menus, widget areas, settings

```ts
theme.registerMenu({ key: 'primary', label: 'Primary Navigation', maxDepth: 2 });

theme.registerWidgetArea({
  key: 'sidebar',
  label: 'Sidebar',
  allowedBlockTypes: ['text', 'image'],
});

theme.registerThemeSetting({
  key: 'accent',
  type: 'color',
  default: '#2563eb',
});
```

Setting types: `text`, `color`, `select`, `boolean`, `image`, `number`.

### Editor extensions

```ts
theme.registerToolbarButton({
  id: 'preview',
  icon: 'eye',
  label: 'Preview',
  action() { /* ... */ },
});

theme.registerInspectorPanel({
  id: 'seo',
  title: 'SEO',
  component: SeoPanel,
});

theme.registerCommand({
  id: 'toggle-dark',
  execute(context) { /* ... */ },
});

theme.registerShortcut({
  keys: 'Ctrl+Shift+D',
  command: 'duplicate',
});

theme.registerEditorPlugin({
  id: 'my-plugin',
  setup(context) { /* ... */ },
});
```

### Hooks and lifecycle

```ts
theme.onInstall(() => {});
theme.onActivate(() => {});
theme.onDeactivate(() => {});
theme.onUpgrade(() => {});
theme.onRender(() => {});
theme.onDestroy(() => {});

theme.beforeRender(() => {});
theme.afterRender(() => {});
theme.beforeSave(() => {});
theme.afterSave(() => {});
theme.beforePublish(() => {});
theme.afterPublish(() => {});
```

Hook handlers receive a typed context:

```ts
interface ThemeHookContext {
  slug: string;
  page?: { slug: string; type: string };
  user?: { id: string; role: string } | null;
  [key: string]: unknown;
}
```

### Middleware, providers, services

```ts
theme.registerMiddleware({
  handler: async (context, next) => {
    await next();
  },
  priority: 10,
});

theme.registerProvider({
  id: 'themeStore',
  create() {
    return { /* ... */ };
  },
});

theme.registerService({
  id: 'analytics',
  factory() {
    return { /* ... */ };
  },
});
```

Middleware can intercept rendering, saving, publishing, asset loading, preview generation, and API calls (as the runtime wires them).

### Assets

```ts
theme.registerStyle('./assets/style.css');
theme.registerScript('./assets/theme.js');
theme.registerFont('./assets/fonts/inter.woff2');
```

`style.css` and `theme.js` are also auto-discovered when placed at conventional paths.

### Validators, previews, field types, breakpoints

```ts
theme.registerValidator({
  id: 'slug-format',
  validate(value, context) {
    return typeof value === 'string' && value.length > 0 ? null : 'Required';
  },
});

theme.registerPreview({ id: 'card', component: CardPreview });
theme.registerFieldType({ id: 'gradient', component: GradientEditor });
theme.registerBreakpoint({ id: 'tablet', label: 'Tablet', minWidth: 768 });
```

---

## Auto-discovery

The runtime scans standard folders **before** executing `theme.ts`. Explicit registrations in
`theme.ts` override auto-discovered defaults.

| Folder | Convention |
| --- | --- |
| `templates/` | `Index.tsx` → `index`, `Home.tsx` → `home`, etc. |
| `partials/` | `Header.tsx` → `header`, `Footer.tsx` → `footer`, `Sidebar.tsx` → `sidebar` |
| `blocks/{Name}/` | `Renderer.tsx` + optional `schema.ts` → block type `kebab-case(name)` |
| `assets/style.css` | Registered as stylesheet |
| `assets/theme.js` | Registered as browser script |
| `assets/fonts/*` | Registered as font assets |

---

## Runtime loading sequence

```text
Upload ZIP
    ↓
Extract to temp directory
    ↓
Read theme.json
    ↓
Validate package (structure, semver, paths, registration)
    ↓
Load theme.ts (at runtime / on activate)
    ↓
Execute registration callback
    ↓
Merge auto-discovery + theme.ts → ThemeRuntimeRegistry
    ↓
Build effective manifest
    ↓
Resolve templates, partials, blocks
    ↓
Resolve assets
    ↓
Render
```

At **upload validation**, `theme.ts` is **not executed** (security). The validator runs
auto-discovery and checks that declared paths exist. At **runtime load**, `ThemeLoader`
compiles and executes `theme.ts`.

---

## Theme runtime registry

Executing `theme.ts` populates a centralized registry consumed by the runtime:

```ts
ThemeRuntimeRegistry {
  templates: {},
  blocks: {},
  partials: {},
  commands: {},
  menus: {},
  settings: {},
  hooks: [],
  middleware: [],
  services: {},
  breakpoints: {},
  editorPlugins: {},
  toolbarButtons: {},
  inspectorPanels: {},
  shortcuts: {},
  providers: {},
  validators: {},
  previews: {},
  fieldTypes: {},
  assets: [],
  editableSections: [],
}
```

After load, `LoadedTheme.registry` exposes this object to CMS integrations (editor extensions, hook runners, etc.).

Implementation: `src/modules/themeEngine/registration/`.

---

## Allowed `.ts` files

Context-restricted TypeScript (in addition to `.tsx` templates and block renderers):

| Path | Purpose |
| --- | --- |
| `theme.ts` | Registration bootstrap (root) |
| `blocks/**/schema.ts` | Block field schemas |
| `editor/**` | Editor extension modules |
| `hooks/**` | Lifecycle hook modules |
| `middleware/**` | Middleware modules |
| `providers/**` | Provider modules |

Only root `theme.json` is permitted as `.json`.

---

## Validation and error reporting

During upload, the CMS validates:

- Duplicate block types, commands, templates
- Missing renderers or schemas
- Invalid or escaping paths
- CMS version incompatibility (`compatibleCmsVersion`)
- Invalid hook names
- Missing index template (via manifest, auto-discovery, or registration)
- Missing `theme.ts` when `entry` is declared

Errors are collected in one pass and returned as human-readable validation messages.

Default package limits:

- ZIP upload: 60 MB
- Unpacked size: 50 MB
- Individual file: 10 MB
- Max entries: 2,000

---

## Complete example

### `theme.json`

```json
{
  "name": "Coffee Theme",
  "slug": "coffee-theme",
  "author": "John Doe",
  "version": "1.0.0",
  "compatibleCmsVersion": "^2.0.0",
  "entry": "theme.ts",
  "supportedFeatures": ["block-editor", "menus"],
  "editableSections": [
    { "id": "hero", "label": "Hero", "blockType": "hero" }
  ]
}
```

### `theme.ts`

```ts
import { defineTheme } from '@cms/theme';

export default defineTheme((theme) => {
  theme.registerTemplate('index', './templates/Index');
  theme.registerPartial('header', './partials/Header');
  theme.registerPartial('footer', './partials/Footer');

  theme.registerBlock({
    type: 'hero',
    rendererPath: './blocks/Hero/Renderer',
    schemaPath: './blocks/Hero/schema',
    label: 'Hero',
  });

  theme.registerMenu({ key: 'primary', label: 'Primary Navigation' });

  theme.registerThemeSetting({
    key: 'accent',
    type: 'color',
    default: '#2563eb',
  });

  theme.registerStyle('./assets/style.css');

  theme.onActivate(async (ctx) => {
    console.log(`Theme activated: ${ctx.slug}`);
  });
});
```

### Built-in default theme

The system fallback theme demonstrates the registration model:

```text
src/modules/themeEngine/default-theme-source/
├── theme.json          metadata + entry
├── theme.ts            registrations
├── templates/Index.tsx
├── blocks/Hero/
└── assets/style.css
```

---

## CMS implementation map

| Concern | Module |
| --- | --- |
| Author SDK (`defineTheme`) | `src/modules/themeEngine/sdk/index.ts` |
| Registration types & context | `src/modules/themeEngine/registration/` |
| Bootstrap pipeline | `registration/ThemeBootstrap.ts` |
| Auto-discovery | `registration/autoDiscover.ts` |
| Upload validation | `ThemeValidator.ts` |
| Runtime load | `ThemeLoader.ts` |
| Manifest parsing | `ManifestParser.ts` |

Path alias for theme authors inside the monorepo:

```json
"@cms/theme": ["./src/modules/themeEngine/sdk/index.ts"]
```

---

## Future capabilities

The registration architecture is designed to support, without breaking changes:

- Theme marketplace and premium themes
- Version upgrades and live theme switching
- Theme and plugin dependencies
- Feature flags and experimental APIs
- Collaborative editing and realtime preview
- Theme analytics and cloud assets
- AI-generated blocks and custom property editors
