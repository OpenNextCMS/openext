# Theme Uploading and Activation

How themes are uploaded, installed, and activated in **nextcmsmains**.

This CMS has **two theme systems** during migration. They use different package formats, databases, and APIs. **Public CMS pages** (`/` and `/[slug]`) are driven by the **Theme Engine**; the **Legacy Theme Package Manager** still powers blog styling, token/CSS injection, and the Theme Builder gallery.

| Doc | Focus |
| --- | --- |
| [Theme Engine package format](./theme-engine-editable-sections.md) | `.tsx` ZIP structure, validation limits |
| [Theme Registration (`theme.ts`)](./theme-registration.md) | `theme.ts` bootstrap API |
| [Theme Uploading (legacy JSON)](./theme-upload-format.md) | JSON/token packages, `theme.json` layout |
| [Theme Package Manager](./theme-package-manager.md) | Legacy package architecture |

---

## Which system should I use?

| Goal | Use |
| --- | --- |
| Full site theme on homepage and slug pages | **Theme Engine** — Dashboard → **Theme Engine (Beta)** |
| JSON design tokens, header/footer templates, blog tokens | **Legacy** — Theme Builder / **Themes** gallery |
| React/TypeScript theme with templates and blocks | **Theme Engine** ZIP |
| JSON-only token package | Legacy import (see [theme-upload-format.md](./theme-upload-format.md)) |

---

## System 1 — Theme Engine (primary for public pages)

### Dashboard path

**Dashboard → Theme Engine (Beta)** (`/dashboard/theme-engine`)

### Package format

ZIP containing at minimum:

```text
my-theme/
├── theme.json          # Metadata (name, slug, version, compatibleCmsVersion)
├── theme.ts            # Registration entry (recommended)
├── templates/
│   └── Index.tsx       # Required index template
├── partials/           # Optional Header.tsx, Footer.tsx
├── blocks/             # Optional editable block renderers
└── assets/
    ├── style.css
    └── theme.js        # Optional
```

See [theme-engine-editable-sections.md](./theme-engine-editable-sections.md) and [theme-registration.md](./theme-registration.md) for full specs.

**Zip tip:** `theme.json` must be at the ZIP root or inside one wrapper folder (e.g. `my-theme/theme.json`).

### Upload flow (server)

```
User uploads .zip
    → POST /api/theme-engine/themes/upload  (multipart field: file)
    → guardTheme('create') — auth + permission check
    → themeManager.uploadAndInstall(buffer, userId, { replace? })
    → ThemeInstaller.install():
        1. Size cap (default 60 MB raw ZIP)
        2. Extract to temp dir (zip-bomb guards)
        3. SHA-256 checksum
        4. ThemeValidator.validate() — manifest, templates, semver
        5. Move to THEMES_ROOT/{slug} (atomic swap if replace=true)
        6. Hash assets (style.css, theme.js)
        7. themeRegistry.register() — MongoDB theme_engine_themes row
    → Theme is installed but NOT active yet
```

**Key files:**

| Layer | Path |
| --- | --- |
| API | `src/app/api/theme-engine/themes/upload/route.ts` |
| Installer | `src/modules/themeEngine/ThemeInstaller.ts` |
| Manager | `src/modules/themeEngine/ThemeManager.ts` |
| Registry | `src/modules/themeEngine/ThemeRegistry.ts` |
| Config / limits | `src/modules/themeEngine/config.ts` |

**On disk:**

| Path | Role |
| --- | --- |
| `src/themes/{slug}/` or `THEME_ENGINE_THEMES_DIR` | Installed package source |
| `storage/theme-engine-compiled/{slug}/` | Compiled TSX cache |
| `storage/tmp/theme-uploads/` | Temporary extraction |

**In MongoDB (page DB):**

| Collection | What’s stored |
| --- | --- |
| `theme_engine_themes` | Installed theme metadata, manifest, checksum, `status: installed` |
| `theme_engine_settings` | Singleton doc — **`activeThemeSlug`** (which theme is live) |

Upload does **not** set `activeThemeSlug`. The site keeps using the previous active theme until you activate.

### Activate flow (server)

```
User clicks Activate
    → POST /api/theme-engine/themes/{slug}/activate
    → Optional body: { "applyToEditor": true }
    → guardTheme('activate')
    → themeManager.activate(slug, userId)
    → ThemeRegistry.activate():
        1. Confirm theme status === 'installed'
        2. Transaction: set theme_engine_settings.activeThemeSlug = slug
        3. Store previousThemeSlug for rollback context
        4. Invalidate active-theme cache
    → If applyToEditor: ThemeEngineEditorApplyService.applyToHomepage(slug)
```

**Key files:**

| Layer | Path |
| --- | --- |
| API | `src/app/api/theme-engine/themes/[slug]/activate/route.ts` |
| Registry | `src/modules/themeEngine/ThemeRegistry.ts` → `setActiveSlug()` |
| Repository | `src/modules/themeEngine/repositories/ThemeRepository.ts` |
| Dashboard UI | `src/app/dashboard/theme-engine/page.tsx` |

### How activation affects the live site

Public routes `src/app/page.tsx` and `src/app/[slug]/page.tsx` render through `RenderedPublicPage`:

1. Read `activeThemeSlug` from `theme_engine_settings` (or preview cookie).
2. If **classic CMS mode** (default theme + no `theme-engine-frame` on page) → block JSON + site chrome.
3. Otherwise → **Theme Engine render**:
   - `buildRenderInput()` → `themeManager.renderPage()`
   - Load package from disk, compile TSX, render Header + Template + Footer
   - Inject CSS: `/theme-engine-assets/{slug}/assets/style.css`
   - Inject JS via `ThemeScripts`

On render failure, `ThemeManager` falls back to built-in `theme-engine-default`.

### Theme Engine APIs (summary)

| Action | Method | Endpoint |
| --- | --- | --- |
| List installed | `GET` | `/api/theme-engine/themes` |
| Upload ZIP | `POST` | `/api/theme-engine/themes/upload` — form: `file`, optional `replace=true` |
| Activate | `POST` | `/api/theme-engine/themes/{slug}/activate` — body: `{ applyToEditor?: boolean }` |
| Preview | `POST` | `/api/theme-engine/themes/{slug}/preview` |
| End preview | `DELETE` | `/api/theme-engine/preview` |
| Delete | `DELETE` | `/api/theme-engine/themes/{slug}` |
| Public assets | `GET` | `/theme-engine-assets/{slug}/...` |

### Upload options in the dashboard

- **Replace on upload** — sends `replace=true` when re-uploading the same slug (upgrade in place).
- **Activate** — makes the theme the live Theme Engine theme.
- **Apply to editor** — optional on activate; loads theme onto homepage canvas for editing.
- **Preview** — temporary cookie override; does not change `activeThemeSlug`.

### Example: upload + activate (curl)

```bash
# Upload
curl -X POST "https://YOUR_SITE/api/theme-engine/themes/upload" \
  -H "Cookie: token=YOUR_SESSION" \
  -F "file=@my-theme.zip"

# Activate
curl -X POST "https://YOUR_SITE/api/theme-engine/themes/my-theme/activate" \
  -H "Cookie: token=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"applyToEditor": false}'
```

---

## System 2 — Legacy Theme Package Manager

Used for **JSON token themes**, package CSS/fonts, global header/footer templates, and **blog** styling via `SiteThemeProvider`.

### Package format

ZIP with `theme.json` first, plus tokens, templates, layouts — see [theme-upload-format.md](./theme-upload-format.md).

```text
business-theme/
├── theme.json
├── tokens/              # or inline "theme" in theme.json
├── templates/
│   ├── header.json
│   └── footer.json
├── layouts/
│   └── default.json
├── css/, fonts/, images/
```

### Where legacy data lives

| What | Where |
| --- | --- |
| Active theme | `themes` collection — one doc with `isActive: true` |
| Package files | `storage/themes/{slug}/` |
| Public assets | `/theme-assets/{slug}/...` |

### Legacy activation flow

Upload registers an **inactive** theme. Activation is separate:

```
POST /api/themes/activate  { "id": "<themeId>", "applyToEditor?": boolean }
  or
POST /api/themes/{id}/activate

→ ThemeActivationService.activate():
    1. Deactivate all other themes
    2. Set target theme isActive: true
    3. Sync WebsitePreferences / tokens for live site
    4. Apply header/footer from templates/ (if present)
    5. Optional: apply homepage layout if applyPageLayout flag set
```

**Optional follow-up:**

```
POST /api/themes/{id}/apply-layout
```

Rewrites homepage sections from `layouts/default.json`.

**Key files:**

| Layer | Path |
| --- | --- |
| Activate API | `src/app/api/themes/activate/route.ts`, `src/app/api/themes/[id]/activate/route.ts` |
| Service | `src/modules/theme/services/ThemeActivationService.ts` |
| Loader | `src/lib/theme/theme-loader.ts` — `getActiveTheme()` |
| Site tokens | `src/providers/SiteThemeProvider.tsx` |
| Theme Builder API | `src/components/theme-builder/api.ts` |

### Legacy vs Theme Engine active theme

These are **independent**:

| System | Active flag location | Drives |
| --- | --- | --- |
| Theme Engine | `theme_engine_settings.activeThemeSlug` | `/`, `/[slug]` (when not classic CMS mode) |
| Legacy | `themes.isActive` | Blog routes, CSS variables, `/theme-assets/` |

Activating one does **not** activate the other.

---

## End-to-end checklist (Theme Engine — most common)

1. Build a valid `.tsx` theme ZIP ([format](./theme-engine-editable-sections.md)).
2. Open **Dashboard → Theme Engine (Beta)**.
3. Upload the ZIP (enable **Replace on upload** if upgrading same slug).
4. Click **Activate** on the theme card.
5. Optionally enable **Apply to editor** to load the homepage canvas.
6. Open your public site (`/` or home slug) and hard-refresh.
7. Confirm CSS loads from `/theme-engine-assets/{slug}/assets/style.css`.

If the page still looks like classic blocks:

- Active slug may still be `theme-engine-default`, or
- The page has no `theme-engine-frame` and classic CMS mode applies — activate a non-default theme or add a theme engine frame in the editor.

---

## Security and limits (Theme Engine)

| Limit | Default |
| --- | --- |
| Max upload ZIP size | 60 MB |
| Max unpacked size | 50 MB |
| Max entries in ZIP | 2000 |
| Max single file | 10 MB |
| Zip-slip protection | Yes — extraction guarded |

Configurable via env vars in `src/modules/themeEngine/config.ts` (`THEME_ENGINE_MAX_UPLOAD_BYTES`, etc.).

---

## Startup

On server boot, `src/instrumentation.ts` calls `themeManager.ensureDefaultThemeReady()` to install the built-in `theme-engine-default` theme if missing.

---

## Related dashboard UIs

| UI | Path | System |
| --- | --- | --- |
| Theme Engine gallery | `/dashboard/theme-engine` | Theme Engine upload/activate/preview |
| Theme Builder | Theme Builder screens | Legacy tokens + gallery |
| Dashboard Settings `activeTheme` | Settings page | User DB `settings.themes[]` — **not** the main public render path |

---

## Quick reference — file map

```text
Theme Engine upload/activate
├── src/app/dashboard/theme-engine/page.tsx          # Dashboard UI
├── src/app/api/theme-engine/themes/upload/route.ts
├── src/app/api/theme-engine/themes/[slug]/activate/route.ts
├── src/modules/themeEngine/ThemeManager.ts
├── src/modules/themeEngine/ThemeInstaller.ts
├── src/modules/themeEngine/ThemeRegistry.ts
├── src/modules/themeEngine/repositories/ThemeRepository.ts
└── src/components/theme-engine/RenderedPublicPage.tsx  # Public render router

Legacy activate
├── src/app/api/themes/activate/route.ts
├── src/app/api/themes/[id]/activate/route.ts
├── src/modules/theme/services/ThemeActivationService.ts
└── src/providers/SiteThemeProvider.tsx
```
