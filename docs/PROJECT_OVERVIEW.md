# OpenNext CMS — Project Overview

> **OpenNext CMS** (package: `openextcms`) is a **multi-tenant, block-based Content Management System** built on **Next.js 15 (App Router) · React 19 · MongoDB/Mongoose · Redux Toolkit · JWT auth · OpenRouter AI**.
> It lets non-technical users build and run websites — pages, blogs, forms, themes — from a drag-and-drop admin dashboard, extend them with plugins, and bootstrap a starter site with an AI onboarding wizard.

This document is the high-level tour of the system. For formal design artifacts (ER diagram, class/sequence/activity/state diagrams, DFDs, use-case & component views) see **[`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md)**. For a visual walkthrough of every screen see the **[dark-mode screenshot gallery](./screenshots/README.md)**.

---

## Table of contents

1. [What it does](#1-what-it-does)
2. [Technology stack](#2-technology-stack)
3. [Architecture at a glance](#3-architecture-at-a-glance)
4. [Multi-tenant data model](#4-multi-tenant-data-model)
5. [Roles & permissions](#5-roles--permissions)
6. [Feature areas](#6-feature-areas)
7. [Routing map](#7-routing-map)
8. [API surface](#8-api-surface)
9. [Request flow & middleware](#9-request-flow--middleware)
10. [Project structure](#10-project-structure)
11. [Configuration](#11-configuration)
12. [Getting started](#12-getting-started)
13. [Related documentation](#13-related-documentation)

---

## 1. What it does

| Capability | Summary |
|---|---|
| **Block-based page building** | A dnd-kit canvas editor composes pages from a tree of content blocks (`Page.component`). Supports headers, footers and normal pages. |
| **Blogging** | Full blog engine — posts with block content, authors, categories, tags, SEO, scheduling, comments and moderation. |
| **Drag-and-drop form builder** | A plugin for building forms (text, choice, rating, file, signature, multi-step, conditional logic), collecting submissions, and wiring webhooks + email notifications, with spam protection and analytics. |
| **Themes & layouts** | Installable/creatable themes (design tokens), a theme builder, and configurable blog layouts. |
| **Plugins** | A plugin system (marketplace / uploaded / built-in). Ships the **Form Builder** and **Menu Redirect** plugins. |
| **AI assistance** | OpenRouter-backed AI for onboarding starter-site generation and form generation/optimization. |
| **Analytics & reports** | Blog analytics, form conversion funnels, and menu-redirect click analytics, rendered with recharts. |
| **Multi-tenancy** | Tenancy by **physical database separation** (not a `tenantId` column) — three Mongoose connections. |

---

## 2. Technology stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 15 (App Router, RSC + route handlers), React 19, TypeScript 5 |
| **Styling / UI** | Tailwind CSS 3, Radix UI primitives, `class-variance-authority`, `lucide-react` / `react-icons`, `framer-motion`, `next-themes` (light/dark) |
| **State** | Redux Toolkit + `redux-persist` (client editor state) |
| **Drag & drop** | `@dnd-kit/core` · `sortable` · `modifiers` (page editor + form builder canvases) |
| **Data** | MongoDB via Mongoose 8 (three physical databases) |
| **Auth** | `jsonwebtoken` (sign) + `jwt-decode` (read) + `bcryptjs` (password hashing), HTTP-only-style cookie (`token`) |
| **Validation** | Zod (+ `react-hook-form` / `@hookform/resolvers`) |
| **Charts** | Recharts (wrapped by `components/ui/chart.tsx`) |
| **AI** | OpenRouter chat-completions (`callAI`), default model `google/gemini-2.5-flash`; `jsonrepair` for resilient JSON parsing (`groq-sdk` also present) |
| **Content utilities** | `cheerio`, `isomorphic-dompurify`, `jszip`, `node-vibrant`, `moment-timezone`, `uuid` |
| **Tooling** | ESLint 9, Prettier, Playwright (screenshots), `@mermaid-js/mermaid-cli` (design diagrams) |

Dev server runs on **port 3011**.

---

## 3. Architecture at a glance

A layered Next.js application:

```
Browser (Admin dashboard · Public site · Block editor · Form builder)
      │  HTTPS / JSON
      ▼
middleware.ts  ── cookie gate (dbConnection, token)
      ▼
API route handlers (~100+ route.ts)  ──►  lib/api helpers (requireAuth, response, pagination, errors)
      ▼
Domain services  (authService · form-builder services · theme services · AI provider · generateStarterWebsite · menu-redirect · plugins)
      ▼
Mongoose models (22)  ──►  utils/db.ts  ──►  MongoDB (Master · User · Page databases)
      │
      └──► External: OpenRouter AI · SMTP/email · 3rd-party webhooks · Cloudflare Turnstile
```

Client editor state (page canvas, form builder, theme builder, menu redirect) is normalized in Redux Toolkit slices and persisted with `redux-persist`. See the **system/structure chart** and **component diagram** in `SYSTEM_DESIGN.md` for the detailed view.

---

## 4. Multi-tenant data model

Tenancy is **physical database separation**. `src/utils/db.ts` lazily maintains three cached Mongoose connections and registers each schema onto the correct connection. Cross-database references (e.g. `Page.createdBy → User`) are **logical only**.

| Database | Env var | Collections |
|---|---|---|
| **Master** | (bootstrap: `master`) | `MasterDb` — registry of DB names + URIs |
| **User DB** | `USER_DB_NAME` (`users`) | `User`, `Role`, `Settings`, `Plugin` |
| **Page DB** | `PAGE_DB_NAME` (`pages`) | `Page`, `BlogPost`, `Author`, `Category`, `Tag`, `Comment`, `AnalyticsEvent`, `Layout`, `Theme`, `ThemeSettings`, `WebsitePreferences`, `Form`, `FormSubmission`, `FormVersion`, `MenuRedirectMapping`, `MenuRedirectAnalytics`, `MenuRedirectHistory` |

**22 Mongoose models** in total. Notable relationships:

- `BlogPost` ↔ `Category` / `Tag` are many-to-many via `ObjectId[]`; `BlogPost → Author` is many-to-one.
- Blog `Comment`s and `AnalyticsEvent`s reference **`Page`** (both `Page` and `BlogPost` model content).
- `Form` embeds `FormField[]`, `FormSettings`, `FormAnalytics`; `FormSubmission` and `FormVersion` reference `Form`.
- `User.role` is a *soft* FK — it stores `Role.value` (a number `0–3`), not an `ObjectId`.

Full attribute-level ER diagram and embedded-document structures: `SYSTEM_DESIGN.md §1`.

---

## 5. Roles & permissions

Four roles are seeded into the User DB (`src/utils/db.ts`), forming a privilege hierarchy:

| Role | `value` | Typical scope |
|---|---|---|
| **SuperAdmin** | 0 | Everything, incl. DB bootstrap & sub-user management |
| **Admin** | 1 | Site config, themes/plugins, analytics, onboarding, sub-users |
| **Editor** | 2 | Publish/schedule content, moderate comments, manage forms |
| **Author** | 3 | Author pages/blogs, use AI content generation |

The **Form Builder** plugin layers its own RBAC scope (`Owner / Admin / Editor / Viewer` via `useFormPermissions`) on top of these roles. See the **use-case diagram** in `SYSTEM_DESIGN.md §6.1`.

---

## 6. Feature areas

### Authentication & onboarding
- Email + password login → bcrypt verify → JWT issued as a `token` cookie (`authService`).
- **AI-assisted onboarding wizard** collects a business profile and calls `generateStarterWebsite` → OpenRouter → creates starter `Page` documents, then marks onboarding complete.

### Content — Pages
- **Block/Page editor** (`/Editor`): dnd-kit canvas, layers panel, per-block style/props/prompt panels, live preview, responsive breakpoints, import/export.
- Page types: `page`, `header`, `footer`. Managed under Dashboard → Pages (all pages / headers / footers).

### Content — Blogs
- Block-based post editor with **SEO tab**, featured image, author/category/tag assignment, comments toggle.
- **Status lifecycle**: `draft → scheduled → published → archived` (a cron endpoint publishes scheduled posts).
- Categories, tags, blog **design** and **layout** configuration surfaces.
- Comment **moderation**: `pending → approved / spam`.

### Forms (Form Builder plugin)
- Field catalogue: text/email/phone/number/url/password/date/time, textarea, dropdown/radio/checkbox, rating, file, signature, section header, divider, hidden.
- Per-field: label, placeholder, help text, required, validation (min/max/regex), width (25–100%), order, **conditional rules** (nested AND/OR), options, multi-step index.
- **Settings**: submit button/success/redirect, multi-step, notifications (admin/user email), webhook (URL/method/headers/retry), spam (honeypot + Cloudflare Turnstile + throttle), file upload.
- Public renderer (`/forms/[slug]`) → `POST /api/forms/[id]/submit` → persist submission, bump analytics, async webhook + email side-effects.
- **Versioning** (`FormVersion` snapshots + restore), **submissions** list (CSV export), and **analytics** (views/starts/completions/conversion, drop-off).

### Themes & layouts
- Installable/creatable **themes** (design tokens), a **theme builder** (`/dashboard/themes/new`) with template palettes, per-theme detail/edit, and activation.
- Blog **layout** and **design** configuration.

### Plugins
- Plugin lifecycle = a `Plugin` record: *installed* (record exists) + *enabled* (`isActive`). Sources: `uploaded` / `marketplace` / `builtin`.
- **Form Builder** and **Menu Redirect** ship as plugins; guarded routes return `plugin_not_installed` / `plugin_disabled` until active.
- **Menu Redirect**: map header menu items to pages/blogs/anchors/external/CMS targets via a visual editor, with click analytics and change history.

### Analytics & reports
- **Blog analytics** (`/dashboard/analytics`): views, unique visitors, avg read time, popular posts, top categories, search queries.
- **Form analytics**: conversion funnel + field drop-off.
- **Menu-redirect analytics**: clicks by link. All rendered with recharts.

### AI features
- `callAI()` (OpenRouter) powers onboarding site generation and form generation/optimization/validation (`/api/ai/*`, `/api/forms/ai/*`). Config resolved from `Settings.aiConfig` then env.

---

## 7. Routing map

**Public / auth**: `/` · `/login` · `/onboarding` · `/admin` · `/language` · `/mongodb-setup[/database-setup]` · `/blog` · `/blog/[slug]` · `/blogs` · `/[slug]` (rendered page) · `/forms/[slug]` · `/preview` · `/doc`

**Editor**: `/Editor` (block/page builder)

**Dashboard**: `/dashboard` · `/dashboard/ai-settings` · `/dashboard/analytics` · `/dashboard/profile` · `/dashboard/settings` · `/dashboard/users`
- **Blogs**: `/dashboard/blogs/{allblogs,new,[id]/edit,categories,tags,design,layout}`
- **Pages**: `/dashboard/pages/{allpages,headers,footers}`
- **Themes**: `/dashboard/themes/{allthemes,new,addtheme,[id]}`
- **Plugins**: `/dashboard/plugins`, `…/form-builder/{,,new,[id]/edit,[id]/analytics,[id]/submissions}`, `…/menu-redirect/{,,editor,analytics,history}`

A screenshot of **every** one of these (46 pages, dark mode) is in [`docs/screenshots/`](./screenshots/README.md).

---

## 8. API surface

~100+ `route.ts` handlers under `src/app/api/`, grouped by domain:

`auth` · `pages` · `blogs` · `authors` · `categories` · `tags` · `comments` · `forms` (+ `forms/ai`, `forms/[id]/{submit,submissions,analytics,versions,duplicate,track}`) · `themes` · `theme-settings` · `layouts` · `analytics` · `ai` · `menu-redirect` · `onboarding` · `sub-users` · `plugins`/`editor/uploads` · plus setup/health endpoints (`verify-connection`, `env-connection`, `check-token`, `get-role`, `clear-cookies`, `cron`).

Shared helpers live in `src/lib/api/` — `requireAuth`, `apiOk`/`handleApiError` (`response`), `parsePagination`, `errors`, `slug`, `token-cookie`.

> **Security note:** `requireAuth` currently *decodes* the JWT (`jwt-decode`) rather than cryptographically verifying the signature — a documented placeholder to harden (HS256 with `JWT_SECRET`) before production.

---

## 9. Request flow & middleware

`src/middleware.ts` gates the app on two cookies:

- **`dbConnection`** — whether the database is configured/connected.
- **`token`** — the JWT session cookie.

Behaviour (matcher: `/`, setup routes, `/dashboard/:path*`, `/login`):
- `/` → redirects to `/language` if `dbConnection` is not `true`.
- Setup routes (`/language`, `/mongodb-setup`, `/mongodb-setup/database-setup`, `/admin`) are **blocked once the DB is connected** (redirect to `/login`).
- With a `token`, `/login` redirects to `/dashboard`.

This is why the setup/auth pages behave as gated redirects depending on session state. Detailed sequence diagrams: `SYSTEM_DESIGN.md §2.3`.

---

## 10. Project structure

```
src/
├── app/                # Next.js App Router
│   ├── (auth)/         # login, admin, language, mongodb-setup
│   ├── api/            # ~100+ route.ts handlers (grouped by domain)
│   ├── dashboard/      # admin dashboard (blogs, pages, themes, plugins, analytics, …)
│   ├── Editor/         # block/page editor
│   ├── blog/ [slug]/ forms/ preview/ …   # public surfaces
├── components/         # UI + feature components (form-builder, blog, plugins, ui/…)
├── models/             # 22 Mongoose schemas
├── lib/                # api/, ai/, form-builder/(services), menu-redirect/, theme/, plugins/, validation/, seo/, blog/, analytics/, image-library/
├── modules/auth/       # authService, authValidation
├── services/           # blockFactory, content-personalizer, generateStarterWebsite
├── redux/              # store + slices (canvas, formBuilder, formSubmission, formAnalytics, themeBuilder, menuRedirect)
├── context/ hooks/ providers/ templates/ themes/ styles/ types/ utils/
└── middleware.ts
docs/
├── PROJECT_OVERVIEW.md         # this file
├── SYSTEM_DESIGN.md            # ER / UML / DFD / use-case / component diagrams
├── diagrams/                   # rendered diagram PNGs + Mermaid sources
└── screenshots/                # 46 dark-mode screenshots + gallery README
```

---

## 11. Configuration

Environment variables (`.env`):

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Secret for signing/verifying session JWTs |
| `MONGODB_URI` | MongoDB connection string (base URI; DB name appended per-connection) |
| `MONGODB` | Connection mode selector (`uri` \| `atlas` \| `compass`) |
| `USER_DB_NAME` | User database name (default `users`) |
| `PAGE_DB_NAME` | Page/tenant database name (default `pages`) |
| `DEFAULT_HOME_SLUG` | Slug used for the site home page (`default_home`) |
| `WEB_ACCESS_KEY` | Access key gate |
| `isRegistration`, `dbConnection`, `NEXT_PUBLIC_needsRestart` | Setup/bootstrap flags (managed by the setup flow) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | AI provider fallback (also configurable in Settings → AI) |

> The setup flow (`/api/verify-connection`) can rewrite `dbConnection` / `isRegistration` in `.env` based on live DB reachability.

---

## 12. Getting started

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env      # (or create .env) and fill MONGODB_URI, JWT_SECRET, DB names

# 3. Run the dev server (http://localhost:3011)
npm run dev
```

**Scripts** (`package.json`):

| Script | Action |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3011 |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run screenshots` | Capture dark-mode screenshots of every page (Playwright) |

First run walks through language → MongoDB setup → super-admin creation → AI onboarding, then lands on the dashboard.

---

## 13. Related documentation

- **[`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md)** — database design, architecture & UML (class, sequence, activity, state), forms & reports design, data-flow diagrams, and use-case/component views (with rendered diagrams under [`docs/diagrams/`](./diagrams/README.md)).
- **[`screenshots/README.md`](./screenshots/README.md)** — dark-mode screenshot gallery of all 46 pages/features, grouped by area.
