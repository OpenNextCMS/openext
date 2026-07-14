# Theme Builder

In-app design-token editor for OpenNext CMS. Themes are configuration — not React
or PHP code. Tokens become CSS custom properties on `.site-theme-scope` for the
public site and the editor canvas.

| Related docs | |
| --- | --- |
| [Theme Uploading](./theme-upload-format.md) | Import token JSON/ZIP or upload a full package |
| [Theme Package Manager](./theme-package-manager.md) | Full ZIP packages (tokens + assets + templates) |

---

## Concepts

- **System themes** — seeded from `src/themes/` (startup, agency, corporate, …). Read-only; duplicate to edit.
- **Custom themes** — created in the dashboard, imported as tokens, or uploaded as packages.
- **Active theme** — exactly one `Theme.isActive` document in the tenant page DB. Public pages load it via `getActiveTheme()` / `ThemeLoader`.
- **CSS variables** — mapped in `src/lib/theme/cssVars.site.ts` (`themeConfigToCssVars`).

Dashboard: **Themes** gallery → open a theme → Builder tabs (Colors, Typography, Spacing, Radius, Shadows, Layout, Variants).

---

## Token → CSS mapping

### Colors

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

Accepted color formats: hex, `rgb(a)`, `hsl(a)`, `var(--…)`.

### Typography

| Key | CSS variable | Default |
| --- | --- | --- |
| `displayFont` | `--font-display` | `Inter, system-ui, sans-serif` |
| `headingFont` | `--font-heading` | `Inter, system-ui, sans-serif` |
| `bodyFont` | `--font-body` | `Inter, system-ui, sans-serif` |
| `baseFontSize` | `--font-size-base` | `16px` |
| `lineHeight` | `--line-height-base` | `1.6` |

### Spacing / radius / shadows / layout

| Group | Examples |
| --- | --- |
| Spacing | `--space-xs` … `--space-xl` (also `--container-padding` from `lg`) |
| Radius | `--radius-sm` … `--radius-2xl` (also `--radius` from `md`) |
| Shadows | `--shadow-sm` … `--shadow-xl` |
| Layout | `--layout-width`, `--section-spacing` |

---

## Component variants

`componentVariants` is a `family → variantId` map. On the live site and editor
canvas, matching page blocks swap layout while keeping content
(e.g. `hero-main` → Split when `"hero": "split"`).

| Family | Variant ids | Default |
| --- | --- | --- |
| `navbar` | `default`, `centered`, `split` | `default` |
| `hero` | `main`, `centered`, `split` | `main` |
| `features` | `trio`, `vertical`, `horizontal`, `boxed`, `zigzag`, `bento` | `trio` |
| `cta` | `default` | `default` |
| `pricing` | `default` | `default` |
| `testimonials` | `main`, `single`, `single-large` | `main` |
| `footer` | `default` | `default` |

Source of truth: `src/lib/theme/component-registry.ts` + `block-variant-map.ts`.

---

## Runtime wiring

| Piece | Path | Role |
| --- | --- | --- |
| `SiteThemeProvider` | `src/providers/SiteThemeProvider.tsx` | Public pages: CSS vars + package CSS + variants/presets |
| `ActiveThemeScope` | `src/components/theme-preview/ActiveThemeScope.tsx` | Editor / preview canvas theming |
| `ActiveThemeVariantsProvider` | `src/providers/ActiveThemeVariantsProvider.tsx` | Client context for `RenderBlock` + package presets |
| `ThemeService` | `src/lib/theme/theme-service.ts` | CRUD / activate (package-aware delete & activate) |
| Theme Package Manager | `src/modules/theme/` | Upload, install, export, assets |

Activating a theme clears the short-lived active-theme cache and revalidates
public paths. Package themes may also update global header/footer pages and
`WebsitePreferences.theme`.

---

## APIs (builder-focused)

| Method | Path | Notes |
| --- | --- | --- |
| `GET\|POST` | `/api/themes` | List / create |
| `GET\|PUT\|DELETE` | `/api/themes/[id]` | Read / update / delete |
| `POST` | `/api/themes/[id]/duplicate` | Copy (incl. system → custom) |
| `POST` | `/api/themes/activate` | `{ "id" }` |
| `POST` | `/api/themes/import` | Token JSON or light ZIP |
| `POST` | `/api/themes/upload` | Full theme package ZIP |
| `GET` | `/api/themes/[id]/export` | Portable ZIP export |

Client helper: `src/components/theme-builder/api.ts` (`themeApi`).

Validation: Zod in `src/lib/theme/theme-validator.ts` (+ package validators under
`src/modules/theme/validators/`).

---

## Uploaded packages ↔ builder

If an uploaded package theme is active (or opened in the builder):

- `tokens/colors.json` → Colors tab  
- `tokens/typography.json` → Typography  
- `tokens/spacing.json` → Spacing  
- `tokens/radius.json` → Radius  
- `tokens/shadows.json` → Shadows  

Saving in the builder updates the Theme document and keeps `tokens` aligned so
**export** ships your customizations.

See [Theme Package Manager](./theme-package-manager.md) for the full ZIP layout,
security limits, and asset URLs.
