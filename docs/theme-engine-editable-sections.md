# Theme Engine Upload Package Format

This document defines the ZIP format accepted by **Dashboard → Theme Engine (Beta)**.

Theme Engine packages contain React/TypeScript source (`.tsx`) and are different from the JSON
token packages documented in [Theme Uploading](./theme-upload-format.md).

**New themes should use the `theme.ts` registration system.** See
[Theme Registration (`theme.ts`)](./theme-registration.md) for the full bootstrap API,
auto-discovery rules, hooks, commands, and editor extensions.

---

## Quick-start folder structure

### Recommended (registration-based)

```text
my-theme/
├── theme.json                         Required — metadata only
├── theme.ts                           Required — registration entry point
├── templates/
│   └── Index.tsx                     Required (index fallback)
├── partials/
│   ├── Header.tsx                    Optional
│   └── Footer.tsx                    Optional
├── blocks/                           Required for editable sections
│   └── Hero/
│       ├── Renderer.tsx
│       └── schema.ts
└── assets/
    ├── style.css                     Recommended
    ├── theme.js                      Optional browser script
    └── fonts/
        └── brand.woff2               Optional
```

### `theme.json` (metadata only)

```json
{
  "name": "My Theme",
  "slug": "my-theme",
  "author": "Your Company",
  "version": "1.0.0",
  "description": "A production website theme.",
  "compatibleCmsVersion": "^2.0.0",
  "entry": "theme.ts",
  "supportedFeatures": ["block-editor"]
}
```

### `theme.ts`

```ts
import { defineTheme } from '@cms/theme';

export default defineTheme((theme) => {
  theme.registerTemplate('index', './templates/Index');

  theme.registerBlock({
    type: 'my-hero',
    rendererPath: './blocks/Hero/Renderer',
    schemaPath: './blocks/Hero/schema',
    label: 'Hero',
  });

  theme.registerStyle('./assets/style.css');
});
```

Templates, blocks, and assets can also be **auto-discovered** from conventional folders when not
explicitly registered. See [Theme Registration](./theme-registration.md#auto-discovery).

`theme.json` must be at the package root. The ZIP may contain the files directly or one wrapper directory:

```text
my-theme.zip
└── my-theme/
    ├── theme.json
    ├── theme.ts
    └── ...
```

Do not include `node_modules`, build output, secrets, environment files, or server credentials.

---

## Minimal valid theme

### Legacy manifest-only (still supported)

You may declare paths directly in `theme.json` without `theme.ts`:

```json
{
  "name": "My Theme",
  "slug": "my-theme",
  "author": "Your Company",
  "version": "1.0.0",
  "compatibleCmsVersion": "^2.0.0",
  "templates": {
    "index": "templates/Index.tsx"
  },
  "supportedFeatures": []
}
```

Either `templates.index` **or** `"entry": "theme.ts"` (with a matching file and discoverable
`templates/Index.tsx`) must be present.

### `templates/Index.tsx`

```tsx
export default function Index({ theme }: { theme: any }) {
  const site = theme.site();
  const blocks = theme.blocks();

  return (
    <main className="my-theme">
      <h1>{site.name}</h1>
      {blocks}
    </main>
  );
}
```

Every declared `.tsx` file must have a default-exported function or class component.

---

## Complete manifest reference

Registration-based themes keep most declarations in `theme.ts`. The manifest below shows the
**legacy combined format** still accepted for backward compatibility:

```json
{
  "name": "My Theme",
  "slug": "my-theme",
  "author": "Your Company",
  "version": "1.0.0",
  "description": "Theme description (maximum 500 characters).",
  "compatibleCmsVersion": "^2.0.0",
  "entry": "theme.ts",
  "templates": {
    "index": "templates/Index.tsx",
    "home": "templates/Home.tsx",
    "page": "templates/Page.tsx",
    "post": "templates/Post.tsx",
    "archive": "templates/Archive.tsx"
  },
  "partials": {
    "header": "partials/Header.tsx",
    "footer": "partials/Footer.tsx",
    "sidebar": "partials/Sidebar.tsx"
  },
  "menus": [
    {
      "key": "primary",
      "label": "Primary Navigation",
      "maxDepth": 2
    }
  ],
  "widgetAreas": [
    {
      "key": "sidebar",
      "label": "Sidebar",
      "allowedBlockTypes": ["text", "image"]
    }
  ],
  "themeSettings": [
    {
      "key": "accentColor",
      "label": "Accent Color",
      "type": "color",
      "default": "#2563eb"
    },
    {
      "key": "layout",
      "label": "Layout",
      "type": "select",
      "default": "wide",
      "options": ["wide", "boxed"]
    }
  ],
  "supportedFeatures": [
    "dark-mode",
    "rtl",
    "custom-logo",
    "post-thumbnails",
    "widgets",
    "menus",
    "block-editor"
  ],
  "blocks": [
    {
      "type": "my-hero",
      "rendererPath": "blocks/Hero/Renderer.tsx",
      "schemaPath": "blocks/Hero/schema.ts"
    }
  ],
  "editableSections": [
    {
      "id": "hero",
      "label": "Hero",
      "blockType": "my-hero",
      "defaults": {
        "title": "Welcome"
      },
      "hiddenByDefault": false
    }
  ]
}
```

Prefer moving `templates`, `blocks`, `partials`, `menus`, and `themeSettings` into `theme.ts`
registrations instead of duplicating them in `theme.json`.

### Required manifest fields

- `name`: 3–50 characters; letters, numbers, spaces, `_`, and `-`.
- `author`: non-empty string.
- `version`: exact semantic version such as `1.0.0`.
- `compatibleCmsVersion`: semantic-version range; currently use `^2.0.0`.
- **One of:**
  - `templates.index` — relative path to the fallback `.tsx` template, **or**
  - `entry` — path to `theme.ts` (default `theme.ts`) with an index template registered or auto-discovered.

`slug` is optional and is generated from `name` when omitted. If provided, it must be kebab-case.

All paths must:

- Be relative to the theme root.
- Use `/`, not `\`.
- Not begin with `/` or a drive letter.
- Not contain `..`, empty path segments, or NUL bytes.

### Template selection

Theme Engine resolves templates in this order:

- Homepage: `home` → `page` → `index`
- Normal page: `page` → `index`
- Post: `post` → `page` → `index`
- Archive: `archive` → `index`

`index` is always required as the final fallback.

### Theme setting types

Manifest `themeSettings` (or `theme.registerThemeSetting()`) support:

```text
text, color, select, boolean, image, number
```

A `select` setting must include at least one `options` value.

---

## Runtime loading sequence

```text
Upload ZIP → Extract → Read theme.json → Validate
    → Auto-discover folders → Execute theme.ts → Build registry
    → Resolve templates/blocks/assets → Render
```

At upload, `theme.ts` is **not executed** (AST and path validation only). At runtime,
`ThemeLoader` compiles and runs `theme.ts` to populate `LoadedTheme.registry`.

Details: [Theme Registration — Runtime loading sequence](./theme-registration.md#runtime-loading-sequence).

---

## Theme component API

Templates and partials receive:

```tsx
{ theme }
```

Available synchronous methods:

- `theme.site()` — site name, URL, and description.
- `theme.page()` — current page metadata.
- `theme.menu(key)` / `theme.navigation(key)` — menu items.
- `theme.settings()` — manifest defaults merged with saved theme settings.
- `theme.blocks()` — rendered CMS or theme-declared blocks.
- `theme.asset(path)` — URL for an uploaded theme asset.
- `theme.image(reference, options)` — resolved CMS image URL.
- `theme.logo()` — site logo URL or `null`.
- `theme.currentUser()` — limited current-user summary or `null`.
- `theme.header()` / `theme.footer()` — resolved partial or built-in fallback.

Header, footer, and templates use the same calling convention:

```tsx
export default function Header({ theme }: { theme: any }) {
  const items = theme.navigation('primary');

  return (
    <header>
      <a href="/">{theme.site().name}</a>
      <nav>
        {items.map((item: any) => (
          <a key={item.id} href={item.url}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
```

---

## Assets and CSS

Use these conventional files:

```text
assets/style.css
assets/theme.js
```

Register explicitly in `theme.ts` or rely on auto-discovery:

```ts
theme.registerStyle('./assets/style.css');
theme.registerScript('./assets/theme.js');
```

`style.css` is loaded automatically. `theme.js` is emitted as a browser script and is never imported into the server runtime.

Reference package assets with `theme.asset()`:

```tsx
export default function Index({ theme }: { theme: any }) {
  return <img src={theme.asset('assets/hero.webp')} alt="Hero" />;
}
```

In CSS, use the public asset route or relative CSS URLs where appropriate:

```css
@font-face {
  font-family: "Brand";
  src: url("./fonts/brand.woff2") format("woff2");
}
```

---

## Exact editable sections

All valid themes render exactly in the public site and editor preview. Structural editing is opt-in through `blocks` and `editableSections`.

Without `editableSections`, a theme still renders exactly, but the editor cannot infer editable structure from arbitrary TSX.

Register blocks in `theme.ts` or declare them in `theme.json` / auto-discovery under `blocks/`.

### Section manifest contract

```json
{
  "editableSections": [
    {
      "id": "hero",
      "label": "Hero",
      "blockType": "my-hero"
    }
  ]
}
```

With `theme.ts`:

```ts
theme.registerBlock({
  type: 'my-hero',
  rendererPath: './blocks/Hero/Renderer',
  schemaPath: './blocks/Hero/schema',
});
```

Rules:

- Every `editableSections[].blockType` must match a registered or declared block type.
- Section IDs must be unique, 2–64 characters, begin with a letter, and use lowercase letters, numbers, and hyphens.
- Put schema `.ts` files under `blocks/`.
- Templates must render `theme.blocks()` when editable blocks are present.
- Use stable section IDs across theme upgrades to preserve saved content.

### Block schema

`blocks/Hero/schema.ts`:

```ts
const schema = {
  fields: [
    { key: 'kicker', label: 'Kicker', type: 'text', default: 'New collection' },
    { key: 'title', label: 'Title', type: 'text', default: 'Welcome' },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      default: 'Introduce your business.'
    },
    { key: 'image', label: 'Image', type: 'image', default: '' },
    { key: 'accent', label: 'Accent', type: 'color', default: '#2563eb' },
    { key: 'showButton', label: 'Show button', type: 'boolean', default: true },
    {
      key: 'alignment',
      label: 'Alignment',
      type: 'select',
      default: 'left',
      options: ['left', 'center']
    },
    {
      key: 'items',
      label: 'Cards',
      type: 'list',
      default: [],
      itemFields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Body', type: 'textarea' },
        { key: 'href', label: 'Link', type: 'url' }
      ]
    }
  ]
};

export default schema;
```

Editable schema field types:

```text
text, textarea, color, image, number, boolean, url, select, list
```

### Block renderer

`blocks/Hero/Renderer.tsx`:

```tsx
export default function HeroRenderer({
  data,
  block
}: {
  data?: Record<string, unknown>;
  block?: any;
}) {
  const values = data || block?.data || {};

  return (
    <section className="hero">
      <p>{String(values.kicker || '')}</p>
      <h1>{String(values.title || 'Welcome')}</h1>
      <p>{String(values.description || '')}</p>
    </section>
  );
}
```

The renderer receives:

- `data`: normalized section field values.
- `block`: block metadata and the same values under `block.data`.
- `schema`: the loaded schema export.

### Template pattern for exact parity

```tsx
export default function Index({ theme }: { theme: any }) {
  const blocks = theme.blocks();

  if (Array.isArray(blocks) && blocks.length > 0) {
    return <main className="my-theme">{blocks}</main>;
  }

  // Gallery preview / initial fallback before sections are seeded.
  return (
    <main className="my-theme">
      <section className="hero">
        <h1>Welcome</h1>
      </section>
    </main>
  );
}
```

To keep the editor and public page identical, the section renderers should use the same class names and markup as the fallback template.

---

## Allowed files

Allowed anywhere in the package:

```text
.tsx, .css, .js, .woff, .woff2, .ttf,
.png, .jpg, .jpeg, .svg, .webp, .avif
```

Context-restricted:

- `.json`: only root `theme.json`.
- `.ts`: allowed at:
  - `theme.ts` (registration bootstrap)
  - `blocks/**/schema.ts`
  - `editor/**`, `hooks/**`, `middleware/**`, `providers/**`

Not supported: `.html`, `.gif`, `.otf`, Markdown, arbitrary JSON data files, server binaries, and executable scripts.

---

## Runtime source restrictions

Theme source is transpiled at runtime, not bundled as a normal application package.

For reliable uploads:

- Keep every declared renderer/template/partial self-contained.
- Avoid relative component imports such as `import Hero from './Hero'`; imported dependencies are not automatically bundled.
- Do not import npm packages from the theme.
- Do not use Next.js aliases such as `@/components/...` (except `@cms/theme` in `theme.ts`, which the runtime rewrites).
- Do not query the database, filesystem, environment variables, or private APIs.
- Do not use browser globals during server rendering.
- Use `assets/theme.js` for optional browser-only behavior.
- Avoid module-level side effects outside `defineTheme()`.
- Render data supplied through the `theme` API or block props.

Theme TSX executes on the server. Only install packages from trusted authors.

---

## Package validation limits

Default limits:

- ZIP upload: 60 MB.
- Total unpacked size: 50 MB.
- Individual file: 10 MB.
- Entries: 2,000.
- Maximum compression ratio per entry: 120.

The installer rejects path traversal, escaping symlinks, disallowed file types, missing declared files, incompatible CMS versions, malformed manifests, duplicate registrations, and TSX files without a usable default-exported component.

---

## Creating the ZIP

From the repository root in PowerShell:

```powershell
Compress-Archive `
  -Path .\examples\coffee-time-theme\* `
  -DestinationPath .\examples\coffee-time-theme.zip `
  -Force
```

To package your own theme:

```powershell
Compress-Archive `
  -Path .\my-theme\* `
  -DestinationPath .\my-theme.zip `
  -Force
```

Upload the resulting ZIP from **Dashboard → Theme Engine (Beta) → Upload theme**.

When replacing an installed theme:

1. Increase the semantic `version`.
2. Keep the same `slug`.
3. Upload with the replace option.
4. Activate with **Also load this theme onto the page editor canvas**.

---

## Editing workflow

1. Upload and install the ZIP.
2. Activate the theme with **Also load this theme onto the page editor canvas**.
3. Open the homepage editor.
4. Click a rendered section or its section chip.
5. Edit schema fields, hide/show, or reorder sections.
6. Save the page.

Legacy packages without `editableSections` remain visually exact but do not provide structural controls. They are never converted into inaccurate generic CMS blocks.

---

## Reference packages

| Package | Location |
| --- | --- |
| Built-in default theme (registration-based) | `src/modules/themeEngine/default-theme-source/` |
| Coffee Time example | `examples/coffee-time-theme/` |
| Installed dev copy | `themes/coffee-time/` |

Registration API reference: [Theme Registration (`theme.ts`)](./theme-registration.md).
