# Plugin Backend Architecture

This document describes the extended NextCMS plugin system. Plugins can now ship frontend assets **and** backend server modules from a single ZIP upload.

## Overview

| Layer | Location | Served publicly? |
|-------|----------|------------------|
| Frontend assets | `public/plugins/{pluginId}/` | Yes |
| Backend code | `plugins/{pluginId}/` | **Never** |

Backend code is loaded by the CMS at startup (and on enable/upload). Plugin APIs are automatically namespaced under:

```text
/api/plugins/{pluginId}/*
```

Example:

```text
GET  /api/plugins/crm-plugin/customers
POST /api/plugins/crm-plugin/customers
PUT  /api/plugins/crm-plugin/customers/:id
```

## Package structure

```text
crm-plugin/
├── manifest.json
├── admin/
│   └── index.html
├── block/                 (optional)
├── assets/
├── package.json           (optional)
└── server/
    ├── index.js           (required when using backend)
    ├── routes/
    ├── controllers/
    ├── services/
    ├── middleware/
    ├── models/
    ├── migrations/
    ├── hooks/
    └── jobs/              (reserved for scheduled jobs)
```

## Upload lifecycle

```text
Upload ZIP
  → Validate ZIP + manifest
  → Extract frontend → public/plugins/{id}/
  → Extract backend  → plugins/{id}/
  → Run pending migrations
  → Run install hook
  → Register permissions
  → Load server module + routes
  → Save plugin metadata
  → Enable plugin
```

On failure, extracted files and partial DB rows are rolled back.

## Extended manifest.json

```json
{
  "id": "crm-plugin",
  "name": "CRM",
  "version": "1.0.0",
  "kind": "system",
  "adminEntry": "admin/index.html",
  "blockEntry": "block/index.js",
  "serverEntry": "server/index.js",
  "migrations": ["server/migrations"],
  "models": ["server/models"],
  "permissions": ["crm.read", "crm.write"],
  "installHook": "server/hooks/install.js",
  "uninstallHook": "server/hooks/uninstall.js",
  "dependencies": []
}
```

### Backend fields

| Field | Description |
|-------|-------------|
| `serverEntry` | Main server module (default: `server/index.js`) |
| `migrations` | Migration directories (default: auto-detect `server/migrations/`) |
| `models` | Model directories (default: auto-detect `server/models/`) |
| `permissions` | Permission strings registered in CMS settings |
| `installHook` | Runs after migrations during install |
| `uninstallHook` | Runs during uninstall |
| `dependencies` | npm dependencies (optional; install disabled unless `PLUGIN_ALLOW_NATIVE_DEPS=true`) |

## Server module contract

Every backend plugin exports:

```javascript
module.exports = {
  register({ app, cms }) {},
  boot({ app, cms }) {},
  shutdown() {},
};
```

- **`register`** — mount routes, middleware, services
- **`boot`** — run after all plugins are registered
- **`shutdown`** — cleanup when disabled/uninstalled

## Route registration

### Option 1: Inside `register()`

```javascript
module.exports = {
  register({ app, cms }) {
    app.get('/customers', async (req, res) => {
      res.json({ ok: true });
    });
  },
};
```

### Option 2: Auto-loaded route files

Place files in `server/routes/*.js`. Each file may export:

- a function `(app) => void`, or
- an array of `{ method, path, handler }` objects

Routes are mounted relative to `/api/plugins/{pluginId}`.

## CMS SDK (`cms`)

Available in `register`, `boot`, hooks, and migrations:

| API | Description |
|-----|-------------|
| `cms.database.user()` | User DB connection (mongoose) |
| `cms.database.page()` | Page DB connection |
| `cms.models.register(name, schema)` | Register a namespaced mongoose model |
| `cms.models.get(name)` | Retrieve a registered model |
| `cms.logger.info/warn/error` | Plugin-scoped logging |
| `cms.permissions.list()` | Manifest permissions |
| `cms.permissions.has(permission)` | Check current request permission |
| `cms.events.emit/on` | Lightweight plugin event bus |

## Request context

Plugin route handlers receive `req` with:

| Property | Description |
|----------|-------------|
| `req.user` | Authenticated CMS user (from JWT cookie) |
| `req.permissions` | Resolved plugin permissions for the user |
| `req.roles` | Role identifiers |
| `req.params` | Route params (`:id`, etc.) |
| `req.query` | Query string values |
| `req.body` | Parsed JSON/form body |
| `req.cms` | CMS SDK instance |

Authentication is enforced automatically by the plugin loader. Plugins should not implement their own auth stack.

## Database migrations

Migration files live in `server/migrations/` and export:

```javascript
module.exports = {
  name: '001_create_customers',
  async up(cms) {},
  async down(cms) {}, // optional
};
```

Executed migrations are tracked in the `plugin_migrations` collection:

| Field | Description |
|-------|-------------|
| `plugin` | Plugin ID |
| `migration` | Migration name |
| `executedAt` | Timestamp |

Migrations never run twice for the same plugin.

## Models

Model files in `server/models/` may export:

```javascript
const { Schema } = require('mongoose');
module.exports = {
  name: 'Customer',
  schema: new Schema({ name: String }),
};
```

Models are registered as `{pluginId}_{name}` to avoid collisions.

## Install / uninstall hooks

```javascript
// server/hooks/install.js
module.exports = async (cms) => {
  // seed defaults, create settings, etc.
};
```

```javascript
// server/hooks/uninstall.js
module.exports = async (cms) => {
  // optional cleanup
};
```

## Enable / disable / uninstall

| Action | Behavior |
|--------|----------|
| **Disable** | Unload routes; keep DB data |
| **Enable** | Reload server module + routes |
| **Uninstall** | Run uninstall hook → unload routes → remove files → clear plugin metadata |

## Security

### Allowed ZIP content

- `admin/`, `block/`, `assets/`, `fonts/`, `dashboard/`
- `server/` (backend only — extracted outside `public/`)
- `manifest.json`, optional `package.json`

### Rejected paths

- `.env`, `node_modules/`, `.git/`
- Executables: `.exe`, `.dll`, `.bat`, `.cmd`, `.sh`, `.ps1`

### Rules

- Relative paths only (no `..` or `\`)
- Backend code never served from `public/`
- Plugin routes cannot use reserved segment `data` (used by CMS plugin-data API)
- Path traversal blocked when loading modules

## Backward compatibility

Existing frontend-only ZIPs (manifest + admin/block assets) continue to work unchanged. Backend support is optional.

## Example plugin

See `examples/crm-plugin/` for a full reference implementation with:

- Dashboard UI (`admin/index.html`)
- REST routes (`server/routes/customers.js`)
- Service layer (`server/services/CustomerService.js`)
- Mongoose model (`server/models/Customer.js`)
- Migration (`server/migrations/001_create_customers.js`)
- Install/uninstall hooks

Zip the folder and upload via **Dashboard → Plugins → Upload Plugin**.

## Implementation map

| Component | Path |
|-----------|------|
| ZIP extraction (split frontend/backend) | `src/lib/plugins/extract.ts` |
| Manifest validation | `src/lib/plugins/manifest.ts`, `src/lib/plugins/server/validation.ts` |
| Backend loader | `src/lib/plugins/server/loader.ts` |
| Route dispatch | `src/app/api/plugins/[pluginId]/[[...path]]/route.ts` |
| Migration engine | `src/lib/plugins/server/migrations.ts` |
| Lifecycle manager | `src/lib/plugins/server/lifecycle.ts` |
| Startup bootstrap | `src/instrumentation.ts` |
| Plugin SDK | `src/lib/plugins/server/sdk.ts` |

## Environment variables

| Variable | Description |
|----------|-------------|
| `PLUGIN_ALLOW_NATIVE_DEPS=true` | Allow `npm install` for plugin `package.json` during upload |

## Related docs

- [Plugin ZIP Upload Format](./plugin-upload-format.md) — package structure, manifest fields, upload checklist, security limits
