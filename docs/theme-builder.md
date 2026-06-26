# Theme Builder

A site-wide, configuration-driven theming system. Tenants customize their site
appearance (colors, typography, spacing, radius, shadows, layout, component
variants) without touching code. The **active** theme drives the live public
site via CSS variables.

This is a **core** dashboard feature (not a marketplace plugin) and is fully
multi-tenant: themes live in the per-tenant page DB (tenancy = separate DB).

It is independent from the older **blog-only** design system
(`ThemeSettings` + `cssVars.ts` + `BlogThemeProvider`), which is unchanged. It
also **supersedes** the legacy ZIP-upload theme installer (`/api/themes/upload`,
now dormant); `/dashboard/themes/addtheme` redirects to the new create flow.

---

## Architecture

```
Builder UI ──► Redux draft ──► live preview (CSS vars)
   │
   └─► /api/themes (CRUD/activate) ──► Theme model (page DB)
                                          │
Public page ──► SiteThemeProvider ──► getActiveTheme() ──► CSS vars on wrapper
                                          ▲
                                     theme-cache (5s TTL)
```

### Key files
| Concern | File |
| --- | --- |
| Token types | `src/types/theme.ts`, `src/types/component-variants.ts` |
| CSS-var engine | `src/lib/theme/cssVars.site.ts` (`themeConfigToCssVars`, `mergeThemeConfig`, `DEFAULT_THEME_CONFIG`) |
| Model | `src/models/Theme.ts` (+ `getThemeModel` / auto-seed in `src/utils/db.ts`) |
| System themes | `src/themes/*` (Startup, Agency, Corporate, Ecommerce, Portfolio) |
| Seeding | `src/lib/theme/seed.ts`, `scripts/seedThemes.ts` |
| Service / loader / cache | `src/lib/theme/theme-service.ts`, `theme-loader.ts`, `theme-cache.ts` |
| Validation | `src/lib/theme/theme-validator.ts` (Zod) |
| RBAC | `src/lib/theme/permissions.ts`, `guard.ts` |
| APIs | `src/app/api/themes/{route,[id],[id]/duplicate,activate}` |
| Redux | `src/redux/themeBuilderSlice.ts` |
| Providers | `src/providers/SiteThemeProvider.tsx` (public), `ThemeConfigProvider.tsx` (client) |
| Variant registry | `src/lib/theme/component-registry.ts` |
| Builder UI | `src/components/theme-builder/*` |
| Live preview | `src/components/theme-preview/*` |
| Admin pages | `src/app/dashboard/themes/{allthemes,new,[id],addtheme}` |

---

## CSS token reference

`themeConfigToCssVars(config)` emits these custom properties on the public
wrapper (`.site-theme-scope`). Components read them as `var(--token, fallback)`.

| Group | Variables |
| --- | --- |
| Colors | `--color-primary`, `--color-secondary`, `--color-accent`, `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-success`, `--color-warning`, `--color-danger` |
| Typography | `--font-heading`, `--font-body`, `--font-size-base`, `--line-height-base` |
| Spacing | `--space-xs/sm/md/lg/xl`, `--section-spacing` |
| Radius | `--radius` (alias of md), `--radius-sm/md/lg/xl` |
| Shadows | `--shadow-sm/md/lg` |
| Layout | `--layout-width`, `--container-padding` |

The wrapper also sets base `background/color/font/size/line-height` so unstyled
blocks inherit the theme automatically (no per-block change required).

---

## Retrofit rule (how blocks consume the theme)

Per-block inline styles always win; the theme only fills gaps:

```
value = block.style?.x ?? 'var(--token, <original-literal>)'
```

- Pages someone hand-styled keep their look.
- Blocks left at defaults adopt the active theme.
- With **no** active theme (or in the dashboard editor, which is not wrapped in
  `SiteThemeProvider`), `var()` resolves to the original literal → **zero**
  visual change.

Retrofitted so far (representative): `ButtonBlock`, `CardBlock`, `NavbarBlock`,
`HeroMain`, `FeatureTrio`. `TextBlock`/`RowBlock`/`ColumnBlock` inherit via the
cascade. `BlogFeed` already uses the shadcn semantic-token classes. Apply the
same rule to additional components as needed.

---

## Component variants

Variants are visual presets for a section *family* (navbar, hero, features, cta,
pricing, testimonials, footer), selected in the builder and stored on the theme.

They are **not** new draggable block types — the registry
(`component-registry.ts`) maps `(family, variantId)` to an existing
`src/components/ui/*` component. Adding a variant = add a registry entry; no
block-type unions / palettes change.

---

## Seeding (multi-tenant)

The 5 system themes are defined in code (`src/themes/*`) and installed per
tenant DB:

- **Auto-seed (primary):** `getPageDbConnection()` seeds them on first access of
  a fresh tenant DB (`countDocuments() === 0`), mirroring how Roles/Settings are
  seeded. Startup is the default + initial active theme.
- **Manual re-seed:** run `npx tsx scripts/seedThemes.ts` after you add/edit a
  system theme (upserts by slug; idempotent). Auto-seed won't re-run once any
  theme exists.

System themes are **read-only** — duplicate to edit.

---

## RBAC

Theme management is gated by `guardTheme(action)` → `requireAuth()` + role:

- **Owner (SuperAdmin) / Admin:** view + all writes
- **Editor:** view only
- **Viewer / Author:** no access

`getCurrentThemeRole()` is a placeholder (defaults to Admin) like the
menu-redirect/form-builder gates — wire it to the real user→role lookup when
auth is hardened.

---

## Performance

The active theme is served from an in-process cache (`theme-cache.ts`, 5s TTL),
so the hot public-page path skips the DB (load well under 50ms). `update` (of
the active theme) and `activate` call `invalidateActiveThemeCache()`.

---

## Future compatibility (architected, not yet built)

The model reserves a `meta?` bag and keeps token groups flexible so these slot
in without a migration: **export/import**, **versioning/rollback**, **AI theme
generation**, **theme marketplace/sharing**.
