# Theme Upload Format

How to author and upload a **theme package** for the [Theme Builder](./theme-builder.md).

A theme package is a small set of **design tokens** — colors, typography,
spacing, radius, shadows, layout, and component-variant choices. It is **not**
code: there is no React or CSS in a theme. You upload it in one of two forms:

- a raw **`.json`** file (the token manifest), or
- a **`.zip`** bundle — the same `theme.json` manifest plus an optional preview
  image (and room for assets). A ZIP is only a *container*; it never carries code.

Uploading either creates a new **inactive custom theme**; you then **Activate** it
to re-skin the live public site.

- **Upload UI:** Dashboard → **Themes** → **Import** → choose a `.json` or `.zip` file.
- **API:** `POST /api/themes/import` (see [Uploading](#uploading)).
- **Endpoint code:** `src/app/api/themes/import/route.ts`
- **Validator / normalizer:** `src/lib/theme/theme-package.ts`
- **ZIP unpacker:** `src/lib/theme/theme-zip.ts`

---

## Quick start

1. In **Dashboard → Themes**, click **Import → Download starter template** to get a
   valid `theme-template.json` pre-filled with the defaults.
2. Edit the values you want to change. You can delete any fields you don't want to
   override — missing fields fall back to the platform defaults.
3. Click **Import** and choose your file.
4. Find the new theme in the gallery and click **Activate** to make it live.

---

## File structure

```jsonc
{
  "format": "nextcms-theme",   // optional, informational
  "version": 1,                 // optional, informational
  "name": "Ocean Breeze",      // optional (falls back to the file name)
  "description": "Cool, airy blue theme",  // optional
  "theme": {                    // the design tokens — see below
    "colors":     { /* ... */ },
    "typography": { /* ... */ },
    "spacing":    { /* ... */ },
    "radius":     { /* ... */ },
    "shadows":    { /* ... */ },
    "layout":     { /* ... */ }
  },
  "componentVariants": {        // optional section-layout choices
    "hero": "split",
    "features": "bento"
  },
  "previewImage": ""            // optional URL or data URI
}
```

### Top-level fields

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `format` | no | string | Informational tag. Convention: `"nextcms-theme"`. Not enforced. |
| `version` | no | number | Package format version. Convention: `1`. Not enforced. |
| `name` | no | string (≤ 80 chars) | Theme name in the gallery. Falls back to the uploaded file name, then `"Imported Theme"`. |
| `description` | no | string (≤ 500 chars) | Short description shown on the theme card. |
| `theme` | **yes\*** | object | The design tokens. See [Token reference](#token-reference). |
| `componentVariants` | no | object | Section-layout choices. See [Component variants](#component-variants). |
| `previewImage` | no | string (≤ 200 000 chars) | Optional preview image URL or data URI. Oversized values are dropped. |

> **\*** The tokens are required, but two shapes are accepted (see below). Every
> individual token *within* `theme` is optional — omitted tokens use the default.

### Two accepted shapes

The importer is forgiving. Both of these are valid:

**Enveloped (recommended)** — tokens under a `theme` key, with metadata alongside:

```json
{ "name": "Ocean", "theme": { "colors": { "primary": "#0ea5e9" } } }
```

**Bare config** — the token groups at the top level, no envelope:

```json
{ "colors": { "primary": "#0ea5e9" }, "typography": { "bodyFont": "Roboto" } }
```

A file must contain at least one recognized token group (`colors`, `typography`,
`spacing`, `radius`, `shadows`, or `layout`), otherwise it is rejected as "not a
valid theme file".

---

## ZIP packages

Instead of a bare `.json`, you may upload a `.zip`. This is the recommended form
when you want to ship a **preview image** alongside the tokens (bundling a real
image file is cleaner than pasting a giant `previewImage` data URI into the JSON).

### Accepted ZIP structure

```text
my-theme.zip
├── theme.json      (required — the token manifest documented above; manifest.json also accepted)
├── preview.png     (optional — gallery image; .jpg / .jpeg / .webp / .gif also accepted)
└── assets/         (optional — fonts or other files; currently ignored on import)
```

- A **single wrapping root folder** is tolerated, e.g. `my-theme/theme.json`.
- The **manifest** (`theme.json`) is validated by the exact same rules as a JSON
  upload — the two paths accept identical token content.
- If no `theme.json` / `manifest.json` is present but the ZIP contains **exactly
  one** `.json` file, that file is used as the manifest.
- A `preview` image is embedded as the theme's preview (as a data URI). If the
  manifest already sets `previewImage`, that value wins and the file is ignored.
- Everything is read **in memory** — the ZIP is never written to disk, so there is
  no path-traversal ("zip-slip") risk. A ZIP cannot install code.

### ZIP limits

| Rule | Limit / behavior |
| --- | --- |
| ZIP file size | ≤ **5 MB** |
| Total uncompressed size | ≤ **10 MB** (zip-bomb guard) → `413` |
| Manifest size | ≤ **512 KB** → `413` |
| Preview image | ≤ **140 KB**; larger is silently skipped (theme still imports) |
| No manifest found | **400** — "No theme.json found in the ZIP" |
| Unreadable archive | **400** — "Could not read the ZIP file" |

> **Note:** This ZIP importer is unrelated to the legacy `/api/themes/extract`
> route, which extracted a ZIP of *code* onto disk. This importer only reads a
> token manifest (plus an optional image) into the database.

---

## Token reference

Every group is optional, and every key within a group is optional. Whatever you
omit is filled from `DEFAULT_THEME_CONFIG` (`src/lib/theme/cssVars.site.ts`), so a
theme is always complete after import. Unknown keys are ignored.

Each token maps to a CSS custom property applied on the public page wrapper
(`.site-theme-scope`); blocks read them as `var(--token, fallback)`. The CSS
variable name is listed so you know exactly what each token drives.

### colors

Accepted value formats: hex (`#abc`, `#aabbcc`, `#aabbccdd`), `rgb()/rgba()`,
`hsl()/hsla()`, or a CSS `var(--...)` reference. **Invalid colors are rejected.**

| Key | CSS variable | Default | Purpose |
| --- | --- | --- | --- |
| `primary` | `--color-primary` | `#2563eb` | Primary brand / buttons / links |
| `secondary` | `--color-secondary` | `#7c3aed` | Secondary accents |
| `accent` | `--color-accent` | `#f59e0b` | Highlights / call-outs |
| `background` | `--color-bg` | `#ffffff` | Page background |
| `surface` | `--color-surface` | `#f8fafc` | Cards / raised surfaces |
| `text` | `--color-text` | `#111827` | Body text |
| `muted` | `--color-muted` | `#6b7280` | Secondary / muted text |
| `success` | `--color-success` | `#16a34a` | Success state |
| `warning` | `--color-warning` | `#d97706` | Warning state |
| `danger` | `--color-danger` | `#dc2626` | Error / destructive state |

### typography

Font values are CSS font stacks (strings). Sizes are any valid CSS length.

| Key | CSS variable | Default |
| --- | --- | --- |
| `displayFont` | `--font-display` | `Inter, system-ui, sans-serif` |
| `headingFont` | `--font-heading` | `Inter, system-ui, sans-serif` |
| `bodyFont` | `--font-body` | `Inter, system-ui, sans-serif` |
| `baseFontSize` | `--font-size-base` | `16px` |
| `lineHeight` | `--line-height-base` | `1.6` |

### spacing

Any valid CSS length (`px`, `rem`, `%`, …).

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

Any valid CSS `box-shadow` string.

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

---

## Component variants

`componentVariants` picks which layout each public section *family* renders with.
It's a `family → variantId` map. All families are optional; an omitted or unknown
family/variant falls back to that family's default.

| Family | Valid variant ids | Default |
| --- | --- | --- |
| `navbar` | `default`, `centered`, `split` | `default` |
| `hero` | `main`, `centered`, `split` | `main` |
| `features` | `trio`, `vertical`, `horizontal`, `boxed`, `zigzag`, `bento` | `trio` |
| `cta` | `default` | `default` |
| `pricing` | `default` | `default` |
| `testimonials` | `main`, `single`, `single-large` | `main` |
| `footer` | `default` | `default` |

Source of truth: `src/lib/theme/component-registry.ts`. Example:

```json
"componentVariants": { "hero": "split", "features": "bento", "testimonials": "single" }
```

---

## Validation & limits

Enforced at import (`POST /api/themes/import`):

| Rule | Limit / behavior |
| --- | --- |
| File size | `.json` ≤ **512 KB**; `.zip` ≤ **5 MB** (see [ZIP limits](#zip-limits)) |
| `name` | trimmed, ≤ 80 chars; blank → file name → `"Imported Theme"` |
| `description` | trimmed, ≤ 500 chars |
| `previewImage` | ≤ 200 000 chars, else silently dropped |
| Colors | must be hex / `rgb(a)` / `hsl(a)` / `var(--…)`; otherwise **400** |
| Sizes / fonts / shadows | must be non-empty strings |
| Missing tokens | filled from defaults (never an error) |
| Unknown keys | ignored |
| No token groups present | **400** — "not a valid theme file" |
| Not a JSON object | **400** |
| Auth / role | requires an authenticated Owner or Admin (`guardTheme('create')`) |

Imported themes are always created **inactive** — importing never changes the
live site until you Activate the theme.

---

## Uploading

### Via the dashboard

Dashboard → **Themes** → **Import** → pick your `.json` or `.zip` file. A toast
confirms the import; the theme appears in the gallery as a Custom theme. Click
**Activate** to go live. The **format** button (next to Import) shows the accepted
structure before you upload.

### Via the API

**JSON body:**

```bash
curl -X POST https://YOUR_SITE/api/themes/import \
  -H "Content-Type: application/json" \
  --cookie "YOUR_SESSION_COOKIE" \
  -d @my-theme.json
```

**Multipart file upload (`.json` or `.zip`):**

```bash
# A JSON manifest
curl -X POST https://YOUR_SITE/api/themes/import \
  --cookie "YOUR_SESSION_COOKIE" \
  -F "file=@my-theme.json"

# A ZIP bundle (theme.json + preview.png)
curl -X POST https://YOUR_SITE/api/themes/import \
  --cookie "YOUR_SESSION_COOKIE" \
  -F "file=@my-theme.zip"
```

Success returns `201` with the created theme in the standard envelope:
`{ "data": { "_id": "…", "name": "…", "isActive": false, … }, "error": null }`.
Errors return the matching status (`400`/`403`/`413`) with
`{ "data": null, "error": { "message": "…" } }`.

---

## Examples

### Minimal — a few overrides

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

### Complete — every group + variants

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

---

## Notes & scope

- Themes are **portable**: a package built for one site imports cleanly into
  another, since it only carries tokens (no site-specific IDs or content).
- **Export is not built yet.** For now, start from the **Download starter template**
  in the Import dialog, or hand-author a file against this spec.
- The optional ZIP form is still **token-based**: the ZIP only bundles the
  `theme.json` manifest and an optional preview image. It is unrelated to the
  legacy, dormant ZIP "website template" *code* installer (`/api/themes/extract`),
  which this system supersedes.

See also: [Theme Builder architecture](./theme-builder.md).
