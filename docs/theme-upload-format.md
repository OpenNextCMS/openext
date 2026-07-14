# Theme Uploading

How to upload themes into OpenNext CMS — from a lightweight token file to a full
ZIP package with CSS, fonts, templates, and presets.

Themes are **configuration + static assets**, not PHP or React code. The package
language is **JSON** (structure + tokens) plus optional **CSS**, **fonts**, and
**images**. Uploading creates an **inactive** custom theme; you **Activate**
(and optionally **Apply layout**) so the live site updates on purpose.

| Related docs | |
| --- | --- |
| [Theme Builder](./theme-builder.md) | Edit tokens after upload; CSS variables |
| [Theme Package Manager](./theme-package-manager.md) | Full package architecture, DB fields, security |
| Sample packages | [`examples/business-theme/`](../examples/business-theme/), [`examples/meridian-theme/`](../examples/meridian-theme/) |

---

## Important files (what the CMS reads first)

When a ZIP is uploaded, the parser finds **`theme.json` first** (that folder
becomes the package root — even if you zip a parent like `examples/my-theme/`).
If `theme.json` is missing or invalid, upload fails (**400**).

### How to zip (Windows)

Zip the **contents** of the theme folder (so `theme.json` is at the ZIP root),
or zip one folder that directly contains `theme.json`:

```powershell
# Correct — theme.json ends up at package root or one wrapper deep
Compress-Archive -Path .\examples\meridian-theme\* -DestinationPath .\meridian.zip -Force
```

Incorrect: zipping a high ancestor (`examples\`) so paths become
`examples/meridian-theme/layouts/...` without a fix — the CMS now detects the
folder that holds `theme.json`, but flatter zips remain safest.

| Priority | File / folder | Why it matters |
| --- | --- | --- |
| **Required** | `theme.json` | **First file accessed.** Name, slug, version, variants, `applyPageLayout`. Without it the package is rejected. |
| **Required\*** | `tokens/*.json` **or** inline `theme` in `theme.json` | Design tokens (colors, type, spacing…). At least one source is required. |
| **Strongly recommended** | `templates/header.json` | Global site header (`nav-bar` blocks). Applied on Activate / Apply layout. |
| **Strongly recommended** | `templates/footer.json` | Global site footer (`footer-section` blocks). Applied on Activate / Apply layout. |
| **Strongly recommended** | `layouts/default.json` | Homepage section order. Needed for “match homepage layout”. |
| Recommended | `componentVariants` in `theme.json` | Which hero / features / etc. variant to build. |
| Optional | `css/`, `fonts/`, `images/`, `assets/` | Package styles and media → `/theme-assets/{slug}/…` |
| Optional | `blocks/`, `presets/` | Builder presets (do not drive live chrome by themselves) |
| Optional | `preview.png`, `thumbnail.jpg` | Gallery cards in the dashboard |

\*Either `tokens/` **or** an inline `theme` object in `theme.json` (or both).

### What “smooth” activation needs

For look **and** structure (not just colors), include at minimum:

```text
your-theme/
├── theme.json                 ← first file (do not set applyPageLayout unless you want auto-rewrite)
├── tokens/                    ← or inline "theme": { ... }
│   ├── colors.json
│   └── …
├── templates/
│   ├── header.json            ← nav-bar block(s)
│   └── footer.json            ← footer-section block(s)
└── layouts/
    └── default.json           ← available for Apply layout; not applied on Activate by default
```

Shipping `layouts/` stores them on the theme but **does not** rewrite the homepage
on Activate. To rewrite the homepage, use **Apply layout** or set
`"applyPageLayout": true` in `theme.json` / the gallery checkbox.

Header/footer template blocks must use canvas types the renderer knows:

- Header → `"type": "nav-bar"`
- Footer → `"type": "footer-section"`

(Shorthand types like `navbar-split` / `footer-default` are normalized on apply,
but `nav-bar` / `footer-section` are preferred.)

### Where files land after upload

Do **not** put packages under `public/` or `src/app/themes/` for this flow.

| Location | Role |
| --- | --- |
| Source / samples | `examples/your-theme/` (dev only) |
| Runtime extract | `storage/themes/{slug}/` (created on upload; gitignored) |
| Public URL | `/theme-assets/{slug}/…` (never raw filesystem paths) |
| Database | Theme document in MongoDB (tokens, templates, layouts, flags) |

---

## Activate & apply — smooth live site

Upload alone **never** changes the live site. Use this sequence:

```text
1. Upload ZIP          →  Theme registered (inactive); layouts stored, NOT applied
2. Activate            →  Tokens + CSS live; header/footer chrome applied
3. Apply layout        →  Optional — homepage sections from layouts/default.json
   (only automatic on Activate if applyPageLayout: true)
4. Hard-refresh site   →  Confirm header, body, footer
```

### Dashboard

1. **Dashboard → Themes → Upload** → choose your `.zip`.
2. Click **Activate** on the new card.
3. If the body layout did not change, click **Apply layout to homepage**
   (or enable **Match homepage layout** / `applyPageLayout` before activate).
4. Open the public site (`/` or your home slug) and hard-refresh.

### What each step does

| Step | Effect |
| --- | --- |
| **Upload** | Validates ZIP → reads `theme.json` first → writes `storage/themes/{slug}/` → MongoDB row (`isActive: false`) |
| **Install** | Optional for packages; verifies assets on disk. Activate auto-installs if you skip this. |
| **Activate** | Deactivates other themes → sets this one active → syncs `WebsitePreferences.theme` → injects CSS vars + package CSS → **upserts global header/footer** from `templates/` (or layout chrome / safe defaults) → if `applyPageLayout: true`, also runs Apply layout → cache bust + revalidate |
| **Apply layout** | Rewrites the **homepage** `component` from `layouts/default.json` + variants; **always** re-applies header/footer chrome |

### `applyPageLayout` in `theme.json`

```json
{
  "name": "Meridian Lab",
  "slug": "meridian-lab",
  "version": "2.0.0",
  "applyPageLayout": true,
  "componentVariants": {
    "navbar": "centered",
    "hero": "split",
    "features": "zigzag",
    "footer": "default"
  }
}
```

| Value | Behavior on Activate |
| --- | --- |
| `true` | Tokens + chrome **and** homepage layout in one click |
| `false` / omitted | Tokens + chrome only; homepage body unchanged (`layouts/` stored for later Apply layout) |

### Checklist if header/footer still look wrong

1. Re-upload a ZIP that includes `templates/header.json` and `templates/footer.json`.
2. Activate again (or click **Apply layout to homepage**).
3. Confirm the toast mentions header/footer `created` or `updated` (not only skipped).
4. Check **Dashboard → Pages → Headers / Footers** — the active global parts should match the theme.
5. Hard-refresh the public page (ISR cache can linger briefly).

APIs:

| Action | Endpoint |
| --- | --- |
| Activate | `POST /api/themes/:id/activate` or `POST /api/themes/activate` `{ "id" }` |
| Apply layout | `POST /api/themes/:id/apply-layout` (also accepts option via gallery UI) |
| Set match layout | `PATCH` / gallery toggle → persists `applyPageLayout` on the Theme |

---

## Choose an upload path

| | **Token package** | **Full theme package** |
| --- | --- | --- |
| **Use when** | You only need colors, typography, spacing, etc. | You also need CSS, fonts, header/footer templates, layouts, block presets |
| **Formats** | `.json` or light `.zip` | `.zip` only |
| **API** | `POST /api/themes/import` | `POST /api/themes/upload` |
| **Dashboard** | **Themes → Upload** (`.json`) | **Themes → Upload** (`.zip`) |
| **Max size** | JSON ≤ 512 KB (`/import`). Legacy light ZIP via `/import` ≤ 5 MB | ZIP ≤ 25 MB (`/upload`; dashboard sends all `.zip` here) |
| **Assets on disk** | No (preview may be embedded as data URI) | Yes — `storage/themes/{slug}/` → `/theme-assets/{slug}/…` |
| **Flags after upload** | Custom theme, inactive | `isPackageTheme: true`, `installed: false`, inactive |

Both paths require an authenticated **Owner** or **Admin** (`guardTheme('create')`).

---

## Path A — Token package (`/api/themes/import`)

Best for portable design tokens. A ZIP here is only a **container** for
`theme.json` + an optional preview image.

### Dashboard

1. Open **Dashboard → Themes**.
2. Click **Upload** (or open the format dialog → **Download starter template** for JSON).
3. Choose a `.json` (token package) or `.zip` (full / token ZIP package).
4. Wait for the success toast — the theme appears as a **Custom** (inactive) card.
5. Click **Activate** when you want it live.

`.json` files use `POST /api/themes/import`. `.zip` files use `POST /api/themes/upload`
(full Theme Package Manager pipeline).

### API

**JSON body:**

```bash
curl -X POST https://YOUR_SITE/api/themes/import \
  -H "Content-Type: application/json" \
  --cookie "YOUR_SESSION_COOKIE" \
  -d @my-theme.json
```

**Multipart file (`.json` or light `.zip`):**

```bash
curl -X POST https://YOUR_SITE/api/themes/import \
  --cookie "YOUR_SESSION_COOKIE" \
  -F "file=@my-theme.zip"
```

Success: `201` with `{ "data": { "_id", "name", "isActive": false, … }, "error": null }`.

### Token manifest (`theme.json`)

```jsonc
{
  "format": "nextcms-theme",   // optional
  "version": 1,                 // optional
  "name": "Ocean Breeze",
  "description": "Cool, airy blue theme",
  "theme": {
    "colors":     { /* ... */ },
    "typography": { /* ... */ },
    "spacing":    { /* ... */ },
    "radius":     { /* ... */ },
    "shadows":    { /* ... */ },
    "layout":     { /* ... */ }
  },
  "componentVariants": {
    "hero": "split",
    "features": "bento"
  },
  "previewImage": ""            // optional URL or data URI (≤ 200 000 chars)
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | no | ≤ 80 chars; falls back to file name → `"Imported Theme"` |
| `description` | no | ≤ 500 chars |
| `theme` | **yes\*** | Design tokens (see [Token reference](#token-reference)) |
| `componentVariants` | no | Live section layouts |
| `previewImage` | no | Dropped if oversized |
| `format` / `version` | no | Informational |

> **\*** Two shapes are accepted (below). Every key *inside* `theme` is optional —
> missing values fill from `DEFAULT_THEME_CONFIG`.

**Enveloped (recommended):**

```json
{ "name": "Ocean", "theme": { "colors": { "primary": "#0ea5e9" } } }
```

**Bare config** (token groups at the root):

```json
{ "colors": { "primary": "#0ea5e9" }, "typography": { "bodyFont": "Roboto" } }
```

At least one of `colors`, `typography`, `spacing`, `radius`, `shadows`, or
`layout` must be present, or the API returns **400**.

### Light ZIP layout

```text
my-theme.zip
├── theme.json      (required — or manifest.json; exactly one .json fallback OK)
├── preview.png     (optional — .jpg / .jpeg / .webp / .gif)
└── assets/         (ignored on /import — use Path B for real assets)
```

- A single wrapping folder is fine (`my-theme/theme.json`).
- Parsed entirely **in memory** (no disk extract; no zip-slip surface).
- Unrelated to the dormant legacy `/api/themes/extract` code installer.

| Rule | Limit |
| --- | --- |
| ZIP file | ≤ **5 MB** |
| Total uncompressed | ≤ **10 MB** → `413` |
| Manifest | ≤ **512 KB** → `413` |
| Preview image | ≤ **140 KB**; larger is skipped (import still succeeds) |
| JSON file alone | ≤ **512 KB** |

Code: `src/app/api/themes/import/route.ts`, `src/lib/theme/theme-package.ts`,
`src/lib/theme/theme-zip.ts`.

---

## Path B — Full theme package (`/api/themes/upload`)

Use for shareable theme ZIPs with tokens **and** assets (CSS, fonts, templates,
layouts, block presets).

### API

```bash
curl -X POST https://YOUR_SITE/api/themes/upload \
  --cookie "YOUR_SESSION_COOKIE" \
  -F "file=@business-theme.zip"
```

- Form field name must be **`file`**.
- Content type: `multipart/form-data`.
- Only **`.zip`** is accepted.

Success: `201` with the registered Theme document (`isPackageTheme: true`,
`installed: false`, `isActive: false`).

### Package layout

```text
business-theme.zip
└── business-theme/                 # optional wrapping folder
    ├── theme.json                  # REQUIRED — first file the CMS reads
    ├── preview.png                 # optional gallery preview
    ├── thumbnail.jpg               # optional thumbnail
    ├── tokens/                     # REQUIRED* (or inline theme in theme.json)
    │   ├── colors.json
    │   ├── typography.json
    │   ├── spacing.json
    │   ├── radius.json
    │   ├── shadows.json
    │   └── layout.json
    ├── templates/                  # strongly recommended for live chrome
    │   ├── header.json             # nav-bar → global Header page
    │   └── footer.json             # footer-section → global Footer page
    ├── layouts/
    │   └── default.json            # strongly recommended for homepage apply
    ├── blocks/                     # optional builder presets
    ├── presets/                    # optional style presets
    ├── assets/
    ├── css/                        # injected when theme is active
    ├── fonts/
    └── images/
```

Samples: [`examples/business-theme/`](../examples/business-theme/),
[`examples/meridian-theme/`](../examples/meridian-theme/) (zipped as
[`examples/meridian.zip`](../examples/meridian.zip)).

### `theme.json` (package metadata)

```json
{
  "name": "Business Theme",
  "slug": "business-theme",
  "version": "1.0.0",
  "author": "OpenNext",
  "description": "Professional Business Theme",
  "preview": "preview.png",
  "thumbnail": "thumbnail.jpg",
  "compatibleCms": "^1.0.0",
  "supports": ["dark-mode", "responsive", "ai-builder", "block-presets"],
  "applyPageLayout": true,
  "componentVariants": { "hero": "split", "features": "bento" }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | Gallery name |
| `slug` | no | Sanitized from name if omitted; unique per tenant |
| `version` | yes\* | Semver (`1.0.0`); defaults to `1.0.0` on legacy files |
| `compatibleCms` | no | Must satisfy CMS theme API `1.0.0` |
| `preview` / `thumbnail` | no | Relative paths inside the ZIP |
| `applyPageLayout` | no | If `true`, Activate also rewrites the homepage from `layouts/` |
| `componentVariants` | no | Section variant map used when building layout blocks |

Design tokens: provide **`tokens/*.json`** and/or an inline `theme` object
(same shape as Path A). At least one is required.

### Upload pipeline (server)

1. Validate ZIP MIME / size (≤ 25 MB)
2. Load with JSZip; reject zip-slip, zip bombs, executables
3. Validate structure + `theme.json` + semver + `compatibleCms`
4. Reject duplicate `slug` (**409**)
5. Write safe files to `storage/themes/{slug}/`
6. Merge tokens into MongoDB (`theme` + `tokens`)
7. Register Theme row (inactive, not yet installed)
8. No durable temp files (processing is in-memory + final storage only)

| Security / size rule | Limit |
| --- | --- |
| ZIP | ≤ **25 MB** |
| Total uncompressed | ≤ **50 MB** |
| Files | ≤ **500** |
| Single file | ≤ **8 MB** |
| Images (preview/thumb) | ≤ **2 MB** each |
| Blocked types | `.exe`, `.php`, `.sh`, `.bat`, … |

Code: `src/modules/theme/` → `ThemeUploadController` / `ThemeUploadService`.

---

## After upload

Uploading or importing **never** activates the live site. See
[Activate & apply — smooth live site](#activate--apply--smooth-live-site) for the
full checklist.

```text
Upload / Import  →  Install (packages, optional)  →  Activate  →  Apply layout (if needed)  →  Export
```

| Step | Endpoint | Notes |
| --- | --- | --- |
| Install | `POST /api/themes/:id/install` | Package themes only; verifies assets on disk. Activation auto-installs if skipped. |
| Activate | `POST /api/themes/:id/activate` or `POST /api/themes/activate` `{ "id" }` | Deactivates others; syncs `WebsitePreferences.theme`; applies header/footer; injects CSS; runs layout apply when `applyPageLayout` is true; clears cache |
| Apply layout | `POST /api/themes/:id/apply-layout` | Rewrites homepage sections + re-applies header/footer chrome |
| Export | `GET /api/themes/:id/export` | ZIP including Theme Builder customizations |
| Delete | `DELETE /api/themes/:id` | Cannot delete the active theme; package delete also removes `storage/themes/{slug}` |

```bash
# Install + activate a package theme (header/footer applied; layout if applyPageLayout)
curl -X POST https://YOUR_SITE/api/themes/THEME_ID/install --cookie "YOUR_SESSION_COOKIE"
curl -X POST https://YOUR_SITE/api/themes/THEME_ID/activate --cookie "YOUR_SESSION_COOKIE"

# Explicitly push homepage layout + chrome
curl -X POST https://YOUR_SITE/api/themes/THEME_ID/apply-layout --cookie "YOUR_SESSION_COOKIE"

# Export after editing in the Theme Builder
curl -X GET https://YOUR_SITE/api/themes/THEME_ID/export \
  --cookie "YOUR_SESSION_COOKIE" -o my-theme.zip
```

When an uploaded package is activated, token files populate the Theme Builder
tabs; saving keeps `tokens` in sync so the next export is current. Public CSS
loads from `/theme-assets/{slug}/css|assets/*.css`. Extracted packages live under
`storage/themes/{slug}/`.

---

## Token reference

Used by both paths. Omitted keys fill from `DEFAULT_THEME_CONFIG`
(`src/lib/theme/cssVars.site.ts`). Invalid colors → **400**. Unknown keys ignored.

### colors

| Key | CSS variable | Default |
| --- | --- | --- |
| `primary` | `--color-primary` | `#2563eb` |
| `secondary` | `--color-secondary` | `#7c3aed` |
| `accent` | `--color-accent` | `#f59e0b` |
| `background` | `--color-bg` | `#ffffff` |
| `surface` | `--color-surface` | `#f8fafc` |
| `text` | `--color-text` | `#111827` |
| `muted` | `--color-muted` | `#6b7280` |
| `success` | `--color-success` | `#16a34a` |
| `warning` | `--color-warning` | `#d97706` |
| `danger` | `--color-danger` | `#dc2626` |

Formats: hex (`#abc` / `#aabbcc` / `#aabbccdd`), `rgb()/rgba()`, `hsl()/hsla()`,
`var(--…)`.

### typography

| Key | CSS variable | Default |
| --- | --- | --- |
| `displayFont` | `--font-display` | `Inter, system-ui, sans-serif` |
| `headingFont` | `--font-heading` | `Inter, system-ui, sans-serif` |
| `bodyFont` | `--font-body` | `Inter, system-ui, sans-serif` |
| `baseFontSize` | `--font-size-base` | `16px` |
| `lineHeight` | `--line-height-base` | `1.6` |

### spacing

| Key | CSS variable | Default |
| --- | --- | --- |
| `xs` | `--space-xs` | `4px` |
| `sm` | `--space-sm` | `8px` |
| `md` | `--space-md` | `16px` |
| `lg` | `--space-lg` (also `--container-padding`) | `24px` |
| `xl` | `--space-xl` | `40px` |

### radius

| Key | CSS variable | Default |
| --- | --- | --- |
| `sm` | `--radius-sm` | `4px` |
| `md` | `--radius-md` (also `--radius`) | `8px` |
| `lg` | `--radius-lg` | `16px` |
| `xl` | `--radius-xl` | `24px` |
| `2xl` | `--radius-2xl` | `32px` |

### shadows

| Key | CSS variable | Default |
| --- | --- | --- |
| `sm` | `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `md` | `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` |
| `lg` | `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` |
| `xl` | `--shadow-xl` | `0 24px 48px -12px rgba(0,0,0,0.18)` |

### layout

| Key | CSS variable | Default |
| --- | --- | --- |
| `containerWidth` | `--layout-width` | `1200px` |
| `sectionSpacing` | `--section-spacing` | `80px` |

### Component variants

```json
"componentVariants": { "hero": "split", "features": "bento", "testimonials": "single" }
```

Full family / variant table: [Theme Builder](./theme-builder.md#component-variants).

---

## Errors

| Status | Typical cause |
| --- | --- |
| `400` | Invalid JSON, missing tokens / `theme.json`, bad colors, unsafe path, blocked file type, CMS incompatibility |
| `403` | Not Owner/Admin |
| `409` | Duplicate theme slug |
| `413` | File or uncompressed content too large |
| `401` | Missing / invalid session |

Response shape: `{ "data": null, "error": { "message": "…", "fields?": { … } } }`.

---

## Examples

### Minimal token import

```json
{
  "format": "nextcms-theme",
  "name": "Sunset",
  "theme": {
    "colors": { "primary": "#f97316", "secondary": "#db2777", "accent": "#facc15" },
    "typography": { "headingFont": "Poppins, system-ui, sans-serif" }
  }
}
```

### Complete token import

```json
{
  "format": "nextcms-theme",
  "version": 1,
  "name": "Midnight",
  "description": "Dark, high-contrast theme with rounded corners",
  "theme": {
    "colors": {
      "primary": "#818cf8", "secondary": "#a78bfa", "accent": "#22d3ee",
      "background": "#0b1020", "surface": "#141a2e", "text": "#e5e7eb",
      "muted": "#94a3b8", "success": "#22c55e", "warning": "#f59e0b", "danger": "#ef4444"
    },
    "typography": {
      "displayFont": "Sora, system-ui, sans-serif",
      "headingFont": "Sora, system-ui, sans-serif",
      "bodyFont": "Inter, system-ui, sans-serif",
      "baseFontSize": "16px", "lineHeight": "1.65"
    },
    "spacing": { "xs": "4px", "sm": "8px", "md": "16px", "lg": "28px", "xl": "48px" },
    "radius": { "sm": "6px", "md": "12px", "lg": "20px", "xl": "28px", "2xl": "36px" },
    "shadows": {
      "sm": "0 1px 2px rgba(0,0,0,0.4)",
      "md": "0 6px 16px -4px rgba(0,0,0,0.5)",
      "lg": "0 16px 32px -8px rgba(0,0,0,0.55)",
      "xl": "0 32px 64px -16px rgba(0,0,0,0.6)"
    },
    "layout": { "containerWidth": "1240px", "sectionSpacing": "96px" }
  },
  "componentVariants": {
    "navbar": "split", "hero": "centered", "features": "bento",
    "testimonials": "single-large", "footer": "default"
  }
}
```

### Full package (zip the sample)

```powershell
Compress-Archive -Path .\examples\business-theme\* -DestinationPath .\business-theme.zip
# Or the high-contrast QA sample:
Compress-Archive -Path .\examples\meridian-theme\* -DestinationPath .\examples\meridian.zip
```

```bash
curl -X POST https://YOUR_SITE/api/themes/upload \
  --cookie "YOUR_SESSION_COOKIE" \
  -F "file=@business-theme.zip"

curl -X POST https://YOUR_SITE/api/themes/THEME_ID/activate \
  --cookie "YOUR_SESSION_COOKIE"
```

---

## Client helpers

`src/components/theme-builder/api.ts`:

| Method | Endpoint |
| --- | --- |
| `themeApi.importTheme(json)` | `POST /api/themes/import` |
| `themeApi.importFile(file)` | `POST /api/themes/import` (multipart) |
| `themeApi.uploadPackage(file)` | `POST /api/themes/upload` |
| `themeApi.install(id)` | `POST /api/themes/:id/install` |
| `themeApi.activate(id)` | `POST /api/themes/activate` |
| `themeApi.applyLayout(id)` | `POST /api/themes/:id/apply-layout` |
| `themeApi.exportZip(id)` | `GET /api/themes/:id/export` |
