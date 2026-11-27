# Plugin Extension Developer Guide

This guide is for:

1. **Plugin developers** who already shipped a complete plugin and want it to accept extensions.
2. **Extension developers** who want to build an add-on for a compatible plugin.

Extensions are **not** complete plugins. They are smaller packages that target one installed plugin.

| Package type | Upload page | Manifest `type` / `kind` | Purpose |
| --- | --- | --- | --- |
| Complete plugin | Dashboard → **Plugins** | `kind`: `system` or `block` | Full product (CRM, forms, payments, …) |
| Extension | Dashboard → **Extensions** | `type`: `plugin-extension` | Add-on for one existing plugin |

Related docs:

- [Plugin ZIP Upload Format](./plugin-upload-format.md)
- [Extension Management](./extension-management.md) (schema, lifecycle, security)

---

## Part A — Adopt extensions in an existing plugin

Your existing plugin keeps working even if you do nothing. Extensions are optional.

To **host** extensions, the plugin must:

1. Export an `extensionHost` object from its server entry (`serverEntry` / `api/index.js`).
2. Use the **same** `pluginId` as the installed plugin id.
3. Declare which capabilities it supports.
4. Implement `registerExtension` and `unregisterExtension`.
5. Be **installed and enabled** in the CMS so the host is loaded.

### A1. What you add (minimal)

In your plugin server module (for example `api/index.js`):

```js
'use strict';

const registered = new Map();

const extensionHost = {
  // MUST match manifest.id / installed pluginId exactly
  pluginId: 'your-plugin-id',

  // Semantic version range of the CMS extension SDK you implement
  sdkVersion: '^1.0.0',

  // Only list capabilities your plugin actually handles
  capabilities: [
    'navigation.register',
    'ui.page.register',
    'settings.register',
    'fields.register',
    'workflows.register',
    'lifecycle.register',
    'api.register',
    'events.subscribe'
  ],

  async registerExtension(registration) {
    // Called when an extension targeting this plugin is enabled
    // registration.extensionId, version, capabilities, permissions, contributions, entry
    registered.set(registration.extensionId, registration);

    // Apply contributions in YOUR product terms, for example:
    // - add a CRM sidebar item
    // - register a custom field type
    // - mount a workflow hook
    // Do not put CRM/ecommerce logic into the CMS. Keep it here.
  },

  async unregisterExtension(extensionId) {
    registered.delete(extensionId);
    // Remove nav/pages/hooks you added for this extensionId
  }
};

module.exports = {
  async register({ app, cms }) {
    // your existing routes / middleware …
  },
  async boot({ cms }) {},
  shutdown() {},

  // Required for hosting extensions
  extensionHost
};
```

You may keep the host in a separate file (recommended for large plugins):

```js
// api/extension-host.js
module.exports = { extensionHost, listRegisteredExtensions };

// api/index.js
const { extensionHost } = require('./extension-host');
module.exports = { register, boot, shutdown, extensionHost };
```

### A2. Rules the CMS enforces

| Rule | Why |
| --- | --- |
| `extensionHost.pluginId` must equal the loaded plugin id | Prevents a CRM host from claiming to be ecommerce |
| Host must be registered while the plugin is enabled | Extensions cannot install against a missing/unloaded host |
| Extension `target.pluginId` must match your plugin id | Routing is exact, never fuzzy |
| Extension `target.version` must satisfy your installed version | Example: host is `2.0.0`, extension asks for `^2.0.0` |
| Extension capabilities ⊆ host capabilities | You only receive contributions you advertised |

If `extensionHost` is omitted, invalid, or the `pluginId` mismatches, the plugin still runs. It simply cannot receive extensions.

### A3. What `registerExtension` receives

```ts
{
  extensionId: string;
  version: string;
  targetPluginId: string;
  capabilities: string[];
  permissions: string[];          // approved permissions only
  contributions?: {
    navigation?: Array<{ id: string; label: string; href: string }>;
    pages?: Array<{ id: string; title: string; entry: string }>;
    settings?: Array<{ key: string; label: string; type: string }>;
    fields?: Array<{ id: string; label: string; fieldType: string }>;
    workflows?: Array<{ id: string; label: string }>;
    events?: Array<{ name: string }>;
    routes?: Array<{ method: string; path: string }>;
  };
  entry?: { frontend?: string; backend?: string };
}
```

Static UI files for an extension are served by the CMS at:

```text
/extensions/{extensionId}/{relativePath}
```

Example:

```text
/extensions/crm-follow-up-notes/ui/pages/follow-ups.html
```

When the extension is enabled, the CMS adds each public **mount module** under `ui/` or `assets/` (`.js` / `.mjs` / `.ts` exporting `mount`) to the target plugin’s sidebar. Opening it mounts that module into the same `#plugin-root` div as the host plugin (no iframe). HTML-only pages are not opened in the dashboard. If the extension is not installed or is disabled, those items are omitted and the plugin’s own pages stay as they are.

### A4. Checklist for an already-shipped plugin

- [ ] Identify your stable plugin id (from `manifest.json` → `id`).
- [ ] Export `extensionHost` with that exact `pluginId`.
- [ ] Choose capabilities you will honor (start small: navigation + pages).
- [ ] Implement idempotent `registerExtension` (safe if called again after restart).
- [ ] Implement `unregisterExtension` (called on disable / unload).
- [ ] Re-upload or redeploy the plugin and **enable** it.
- [ ] Confirm the host appears in `GET /api/dashboard/extensions/hosts`.
- [ ] Install a sample extension that targets your plugin id and version range.
- [ ] Verify `registerExtension` runs when the extension is enabled.

### A5. Example: Root CRM (`openext-crm-suite`)

This plugin already includes a host:

- Host module: `api/extension-host.js`
- Exported from: `api/index.js`
- Plugin id: `openext-crm-suite`
- Version: `2.0.0` → extensions should use `"target.version": "^2.0.0"`
- Debug list: `GET /api/plugins/openext-crm-suite/extensions`

Sample extension for it: `examples/extensions/crm-follow-up-notes/` (also under the CRM repo `extensions/crm-follow-up-notes/`).

### A6. What you do **not** need to change

- Existing plugin ZIP format
- Existing `manifest.json` fields for complete plugins
- Existing routes, models, migrations, or roles
- Frontend React/HTML SPA packaging for the host plugin itself (host uses `adminMount`). New extension pages are mount modules in `#plugin-root`.

---

## Part B — How to build an extension

### B1. Decide the target plugin

You must know:

| Item | Example |
| --- | --- |
| Target plugin id | `openext-crm-suite` |
| Compatible version range | `^2.0.0` |
| Capabilities the host supports | see `GET /api/dashboard/extensions/hosts` |
| Whether the host is enabled | plugin must be active |

If the target plugin has no `extensionHost`, your extension will fail validation with a host / SDK error.

### B2. Folder layout

Only `manifest.json` is required.

```text
my-extension/
├── manifest.json              required
├── README.md                  optional
├── ui/
│   └── pages/
│       └── index.html         optional UI
├── assets/                    optional images/fonts
├── server/
│   └── index.js               optional trusted backend (.ts also allowed)
└── migrations/                optional (trusted only)
```

### B3. Manifest template

```json
{
  "manifestVersion": 1,
  "id": "my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "type": "plugin-extension",
  "description": "What this add-on does",
  "publisher": { "name": "Your Company" },
  "target": {
    "pluginId": "openext-crm-suite",
    "version": "^2.0.0"
  },
  "compatibility": {
    "cms": ">=0.1.0",
    "extensionSdk": "^1.0.0"
  },
  "entry": {
    "frontend": "ui/pages/index.html",
    "backend": "server/index.js"
  },
  "capabilities": [
    "navigation.register",
    "ui.page.register",
    "lifecycle.register"
  ],
  "permissions": [
    "myextension.read"
  ],
  "dependencies": [],
  "contributions": {
    "navigation": [
      {
        "id": "my-page",
        "label": "My Page",
        "href": "ui/pages/index.html"
      }
    ],
    "pages": [
      {
        "id": "my-page",
        "title": "My Page",
        "entry": "ui/pages/index.html"
      }
    ]
  }
}
```

Required fields: `id`, `name`, `version`, `type` (`plugin-extension`), `target.pluginId`, `target.version`, `compatibility.cms`, `compatibility.extensionSdk`.

Rules:

- `id` is immutable across versions.
- Contribution paths must exist in the ZIP.
- Declared capabilities must match the contributions you ship.
- Those capabilities must be supported by the target host.
- Do not use a complete-plugin manifest (`kind: system`) here.

### B4. Optional trusted backend

```js
// server/index.js
module.exports = {
  async register(context) {
    context.logger.info('extension registered', {
      extensionId: context.extensionId,
      targetPluginId: context.targetPluginId
    });

    if (context.permissions.has('myextension.read')) {
      context.navigation.register({
        id: 'my-page-runtime',
        label: 'My Page',
        href: 'ui/pages/index.html'
      });
    }
  },
  async shutdown() {}
};
```

Important:

- Backend code does **not** run on upload or install.
- An admin must approve the requested permissions.
- An admin must approve **trusted execution** before `server/*` or migrations run.
- Prefer `.js`. `.ts` / `.tsx` are accepted and transpiled on install (not a full bundler).

### B5. Create the ZIP

PowerShell (from inside the extension folder):

```powershell
Compress-Archive -Path .\* -DestinationPath ..\my-extension.zip -Force
```

`manifest.json` must be at the ZIP root, or inside a single wrapper folder.

Do not include `node_modules`, `.env`, `.git`, or executables.

### B6. Install flow for testers / admins

1. Target plugin installed + enabled + host registered.
2. Dashboard → **Extensions** → upload ZIP.
3. Review validation (target, capabilities, permissions, security).
4. **Install** (status becomes `installed`, not enabled yet).
5. Open extension details:
   - Approve permissions.
   - Approve trust only if you reviewed the backend.
6. **Enable**.
7. Confirm the target plugin received the registration (plugin-specific API or logs).

### B7. Extension developer checklist

- [ ] `type` is exactly `plugin-extension`
- [ ] `target.pluginId` matches the real plugin id
- [ ] `target.version` matches the installed plugin version range
- [ ] Host capabilities include everything you request
- [ ] Declared files exist and paths are safe relative paths
- [ ] Permissions are the minimum you need
- [ ] ZIP built with manifest at root
- [ ] Uploaded via **Extensions**, not Plugins

---

## Part C — Common mistakes

| Mistake | Result |
| --- | --- |
| Upload extension ZIP on Plugins page | Rejected (`type` is `plugin-extension`) |
| Upload complete plugin on Extensions page | Rejected (wrong package type) |
| Target plugin not enabled / no `extensionHost` | Validation: missing host / unsupported SDK |
| `extensionHost.pluginId` ≠ plugin id | Host ignored (`mismatch`) |
| Extension asks for a capability the host did not list | Validation: unsupported capability |
| Expect backend to run after install only | Backend stays unloaded until trust + enable |
| Put CRM business logic in the CMS | Wrong layer — keep it in the plugin host |

---

## Part D — Quick reference

### Capabilities

- `navigation.register`
- `ui.page.register`
- `api.register`
- `events.subscribe`
- `settings.register`
- `fields.register`
- `workflows.register`
- `lifecycle.register`
- `migrations.register`

### Useful API checks

```http
GET /api/dashboard/extensions/hosts
GET /api/dashboard/extensions
GET /api/dashboard/extensions/{extensionId}
GET /api/plugins/{pluginId}/extensions   # if your plugin exposes one
```

### Working samples

| Path | Purpose |
| --- | --- |
| `examples/extensions/sample-notes/` | Generic SDK sample |
| `examples/extensions/crm-follow-up-notes/` | Extension for `openext-crm-suite` |
| CRM repo `extensions/crm-follow-up-notes/` | Same CRM sample next to the plugin |
| CRM repo `api/extension-host.js` | Host adoption example |

---

## Summary

**Already-made plugin:** add and export `extensionHost` with the correct `pluginId`, capabilities, and register/unregister handlers. Redeploy and enable the plugin. No other plugin format changes are required.

**New extension:** create a ZIP with `type: "plugin-extension"`, set `target.pluginId` / `target.version`, declare capabilities and files, upload from Dashboard → Extensions, then install → approve permissions/trust → enable.
