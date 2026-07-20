# Theme Package Manager

ZIP-based theme packages for OpenNext CMS. Unlike WordPress themes, packages
are **not** PHP templates — they ship design tokens, layouts, templates, presets,
CSS, fonts, and assets that plug into the existing Theme Builder and visual page
builder.

Package language: **JSON** (+ optional CSS / fonts / images). The first file the
CMS reads on upload is always **`theme.json`**.

| Related docs | |
| --- | --- |
| [Theme Uploading](./theme-upload-format.md) | **Start here** — important files, activate/apply checklist, APIs, limits |
| [Theme Builder](./theme-builder.md) | In-app token editor, CSS variables, activation |
| Sample packages | [`examples/business-theme/`](../examples/business-theme/), [`examples/meridian-theme/`](../examples/meridian-theme/) |

---

## Important files

| Priority | Path | Role |
| --- | --- | --- |
| Required | `theme.json` | First file opened; metadata, variants, `applyPageLayout` |
| Required\* | `tokens/*.json` or inline `theme` | Design tokens for CSS variables |
| Strongly recommended | `templates/header.json` / `footer.json` | Live global header & footer |
| Strongly recommended | `layouts/default.json` | Homepage section order on Apply layout |
| Optional | `css/`, `fonts/`, `images/`, `assets/` | Served at `/theme-assets/{slug}/…` |
| Optional | `blocks/`, `presets/` | Builder presets |

\*At least one token source is required.

**Smooth activation:** Upload → Activate. Homepage body layout is **opt-in** —
set `"applyPageLayout": true` in `theme.json`, tick **Match homepage layout**, or
click **Apply layout**. Shipping `layouts/` alone does **not** rewrite the page.
Full checklist:
[Theme Uploading → Activate & apply](./theme-upload-format.md#activate--apply--smooth-live-site).

Runtime storage: `storage/themes/{slug}/` (not `public/`).

---

## Package structure

```text
business-theme.zip
└── business-theme/                 # optional single wrapping folder
    ├── theme.json                  # required metadata
    ├── preview.png                 # optional gallery preview
    ├── thumbnail.jpg               # optional thumbnail
    ├── tokens/
    │   ├── colors.json
    │   ├── typography.json
    │   ├── spacing.json
    │   ├── radius.json
    │   ├── shadows.json
    │   └── layout.json             # optional (Theme Builder layout group)
    ├── templates/
    │   ├── header.json             # optional global header blocks
    │   └── footer.json             # optional global footer blocks
    ├── layouts/
    │   ├── default.json
    │   └── landing.json
    ├── blocks/                     # block presets for the page builder
    │   ├── hero.json
    │   ├── pricing.json
    │   └── …
    ├── presets/                    # style presets (buttons, cards, …)
    │   ├── buttons.json
    │   └── cards.json
    ├── assets/                     # misc static files
    ├── css/                        # global stylesheets (injected when active)
    ├── fonts/
    └── images/
```

Token-only ZIPs (inline `theme` in `theme.json`, no `tokens/` folder) still work
via [`POST /api/themes/import`](./theme-upload-format.md#path-a--token-package-apithemesimport).
Full packages with assets must use **`POST /api/themes/upload`** — see
[Theme Uploading → Path B](./theme-upload-format.md#path-b--full-theme-package-apithemesupload).

### `theme.json`

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
  "supports": [
    "dark-mode",
    "responsive",
    "ai-builder",
    "block-presets"
  ],
  "applyPageLayout": true,
  "componentVariants": {
    "hero": "split",
    "features": "bento"
  }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | Gallery display name (≤ 80 chars) |
| `slug` | no | Derived from `name` if omitted; must match `[a-z0-9-]{3,64}` |
| `version` | yes\* | Semantic version (`1.0.0`). Defaults to `1.0.0` when omitted on legacy files |
| `author` | no | Shown in theme metadata |
| `description` | no | ≤ 500 chars |
| `preview` / `thumbnail` | no | Relative image paths inside the ZIP |
| `compatibleCms` | no | Semver range against CMS theme API `1.0.0` (`^`, `~`, `>=`, exact) |
| `supports` | no | String capability flags |
| `applyPageLayout` | no | If `true`, Activate also applies `layouts/` to the homepage |
| `componentVariants` | no | Live section layout map (see Theme Builder) |

Design tokens come from **`tokens/*.json`** and/or an inline `theme` object
(same shape as the token package). At least one source is required.

---

## APIs

Auth: authenticated **Owner / Admin** via `guardTheme` (same matrix as Theme Builder).

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/themes/upload` | Upload + register a package ZIP (inactive) |
| `GET` | `/api/themes` | List themes |
| `GET` | `/api/themes/:id` | Get one theme |
| `POST` | `/api/themes/:id/install` | Mark installed / verify assets on disk |
| `POST` | `/api/themes/:id/activate` | Activate for the live site |
| `POST` | `/api/themes/activate` | Activate via `{ "id" }` body |
| `DELETE` | `/api/themes/:id` | Delete (also removes `storage/themes/{slug}`) |
| `PUT` | `/api/themes/:id` | Update Theme Builder + package fields |
| `PUT` | `/api/themes/:id/update` | Alias for update |
| `GET` | `/api/themes/:id/export` | Download ZIP (includes builder customizations) |
| `GET` | `/api/themes/:id/assets/*` | Auth-gated asset by theme id |
| `GET` | `/theme-assets/:theme/*` | Public asset pipeline |

### Example: upload → install → activate → export

```bash
# 1. Upload package
curl -X POST https://YOUR_SITE/api/themes/upload \
  --cookie "YOUR_SESSION_COOKIE" \
  -F "file=@business-theme.zip"

# 2. Install (idempotent; activation auto-installs if needed)
curl -X POST https://YOUR_SITE/api/themes/THEME_ID/install \
  --cookie "YOUR_SESSION_COOKIE"

# 3. Activate
curl -X POST https://YOUR_SITE/api/themes/THEME_ID/activate \
  --cookie "YOUR_SESSION_COOKIE"

# 4. Export after Theme Builder edits
curl -X GET https://YOUR_SITE/api/themes/THEME_ID/export \
  --cookie "YOUR_SESSION_COOKIE" -o business-theme-custom.zip
```

Responses use the standard envelope: `{ "data": …, "error": null }`.

---

## Upload flow

1. Validate MIME type and size (ZIP ≤ **25 MB**)
2. Load archive in memory with JSZip (no durable temp files)
3. Reject zip-slip paths, zip bombs, and executables / scripts
4. Validate folder structure + `theme.json` + semver + `compatibleCms`
5. Reject duplicate `slug`
6. Write safe files under `storage/themes/{slug}/`
7. Merge tokens into the Theme document (`theme` + `tokens`)
8. Store templates, layouts, presets; register `isPackageTheme: true`, `installed: false`, `isActive: false`
9. Preview / thumbnail become `/theme-assets/{slug}/preview.*` URLs

---

## Database (Theme model)

Package fields **extend** the existing Theme collection (page DB). They do not
replace the Builder `theme` token object.

| Field | Role |
| --- | --- |
| `name`, `slug`, `version`, `description`, `author` | Metadata |
| `installed` | Package assets verified / ready |
| `isActive` | Live site theme (`active` in product docs) |
| `isSystemTheme` | Seeded read-only theme |
| `isPackageTheme` | Originated from ZIP upload |
| `packageVersion` | Semver from `theme.json` |
| `previewImage`, `thumbnail` | Gallery art URLs |
| `assetsPath` | Server-only storage directory |
| `theme` | Design tokens for Theme Builder + CSS vars |
| `tokens` | Raw `tokens/*.json` (kept in sync with builder) |
| `templates` | `{ header?, footer? }` |
| `layouts` | Named layout JSON |
| `presets` | `{ blocks, styles }` |
| `supports` | Capability flags |
| `componentVariants` | Section layout choices |
| `meta` | Forward-compat bag (`compatibleCms`, upload time, …) |

---

## Activation

When a theme is activated the service:

1. Auto-installs package themes if needed
2. Deactivates every other theme
3. Sets `WebsitePreferences.theme` to the slug
4. Applies CSS variables from `theme` tokens (`SiteThemeProvider`)
5. Injects package CSS from `/theme-assets/{slug}/css|assets/*.css`
6. Applies `templates/header.json` / `footer.json` to global header/footer pages when shaped as `{ component|blocks: [...] }` or a bare blocks array
7. If `applyPageLayout` is enabled on the theme, rewrites the **homepage** body to `layouts/default` (+ block presets / variants) via `POST /api/themes/:id/apply-layout`
8. Invalidates the active-theme cache and calls `revalidatePath`

### Match homepage layout (theme option)

Each theme has an **`applyPageLayout`** flag (checkbox on the Themes gallery card):

- **On** → Activate also replaces homepage sections with the theme’s layout
- **Off** → Activate only changes tokens / CSS / variants (existing page structure kept)

Active themes also show **Apply layout to homepage** to run the rewrite immediately
without re-activating. API: `POST /api/themes/:id/apply-layout` and
`PATCH /api/themes/:id/apply-layout` `{ "applyPageLayout": true }`.

Package `theme.json` may set `"applyPageLayout": true`. Shipping a `layouts/`
folder alone leaves this **false** — homepage body is unchanged on Activate
until you opt in (checkbox / Apply layout / `theme.json`).

---

## Theme Builder integration

| Package file | Builder tab |
| --- | --- |
| `tokens/colors.json` | Colors |
| `tokens/typography.json` | Typography |
| `tokens/spacing.json` | Spacing |
| `tokens/radius.json` | Radius |
| `tokens/shadows.json` | Shadows |
| `tokens/layout.json` | Layout |

Edits in the Theme Builder update both `theme` and `tokens`. **Export** rebuilds
the ZIP from MongoDB (plus on-disk CSS/fonts/images), so customizations remain
portable across CMS installs.

---

## Visual builder integration

When a package theme is active:

| Asset | Runtime effect |
| --- | --- |
| Block presets (`blocks/`) | Available via `useActiveThemePackage().blockPresets` |
| Style presets (`presets/`) | Available via `useActiveThemePackage().stylePresets` |
| Layouts (`layouts/`) | `useActiveThemeDefaultLayout()` prefers `layouts/default` |
| Header / footer templates | Applied on activate to global pages |
| Global CSS | `<link>` tags on public pages |
| Fonts / images | Served from `/theme-assets/{slug}/…` |
| `componentVariants` | Live section swap in `RenderBlock` |

Client helpers: `src/providers/ActiveThemeVariantsProvider.tsx`.

---

## Asset pipeline

- Storage: `storage/themes/{slug}/` (outside `public/`, gitignored except `.gitkeep`)
- Public URL: `/theme-assets/{slug}/path/to/file`
- Never expose raw filesystem paths to clients
- Allowed types: CSS, JS, images, fonts, SVG, JSON, etc. (executables blocked)

---

## Security limits

| Rule | Limit / behavior |
| --- | --- |
| ZIP size | ≤ 25 MB |
| Total uncompressed | ≤ 50 MB |
| Files per package | ≤ 500 |
| Single file | ≤ 8 MB |
| Zip-slip | Rejected (`..`, absolute paths) |
| Executables / scripts | Rejected (`.exe`, `.php`, `.sh`, …) |
| Duplicate slug | **409** |
| Invalid theme schema / tokens | **400** |
| CMS mismatch (`compatibleCms`) | **400** |

Module code: `src/modules/theme/` (controllers → services → repository → validators / utils).

---

## Sample package

Ship a starter under [`examples/business-theme/`](../examples/business-theme/). Zip the
folder (with optional `preview.png` / `thumbnail.jpg`) and upload via
`POST /api/themes/upload`.
