# Extension Management

Extension packages add features to a plugin that has explicitly adopted the extension SDK. They are not complete plugins. The existing plugin ZIP format, manifest, upload route, and runtime are unchanged.

**For plugin and extension authors:** see the step-by-step [Extension Developer Guide](./extension-developer-guide.md) (adopt the host in an existing plugin, and build an extension ZIP).

Upload extensions from **Dashboard → Extensions**. Upload complete plugins from **Dashboard → Plugins**.

## Package format

Only `manifest.json` is required. Other directories are optional.

```text
universal-extension/
├── manifest.json
├── README.md
├── ui/
│   ├── pages/
│   └── assets/
├── server/
│   ├── index.js
│   ├── routes/
│   ├── services/
│   └── hooks/
├── migrations/
└── assets/
```

Packages may ship either compiled JavaScript or TypeScript source under `server/`, `ui/`, `assets/`, and `migrations/`.

- `.js`, `.cjs`, and `.mjs` are stored and loaded as-is.
- `.ts` and `.tsx` are accepted in the ZIP. During install or update the CMS transpiles them to sibling `.js` files and rewrites `entry`, contribution, and migration paths in the stored manifest to those `.js` files.
- This is a transpile, not a bundler. Packages that import npm modules or ship a full React/Vue app should still be built before upload.
- `.jsx` alone is not accepted; use `.tsx` or precompiled `.js`.

A single wrapper folder is accepted when `manifest.json` is directly inside it.

Allowed file types: `.json`, `.md`, `.txt`, `.html`, `.htm`, `.css`, `.js`, `.cjs`, `.mjs`, `.ts`, `.tsx`, images, and web fonts. Executables, shell scripts, `.env`, `node_modules`, and `.git` are rejected.

## Manifest schema

`manifestVersion` is `1`. Unknown fields are rejected.

| Field | Required | Notes |
| --- | --- | --- |
| `id` | Yes | Immutable. 3–64 lowercase letters, numbers, `-`, `_`. |
| `name` | Yes | Human-readable name. |
| `version` | Yes | Strict semantic version, such as `1.2.3`. |
| `type` | Yes | Must be `plugin-extension`. |
| `description` | No | Plain text. |
| `publisher` | No | `{ name, url? }`. |
| `target.pluginId` | Yes | Installed plugin this package extends. |
| `target.version` | Yes | Semantic version range, such as `^1.0.0`. |
| `compatibility.cms` | Yes | CMS version range. This CMS reports `CMS_VERSION` or `0.1.0`. |
| `compatibility.extensionSdk` | Yes | SDK range. The runtime SDK is `1.0.0`. |
| `entry.frontend` | No | Path under `ui/` or `assets/`. For dashboard pages use a mount module (`.js` / `.mjs` / `.ts` exporting `mount`). |
| `entry.backend` | No | Path under `server/` ending in `.js`, `.cjs`, `.mjs`, `.ts`, or `.tsx`. TypeScript is compiled on install. |
| `entry.flow` | No | Path to a `.json` file under `ui/` or `assets/` (e.g. `ui/flow.json`). Host uses it to adjust field layout, formulas, and steps from the extension only. |
| `capabilities` | No | Subset of the capability list below. |
| `permissions` | No | Names such as `notes.read`. |
| `dependencies` | No | `{ id, version }[]` extension dependencies. |
| `migrations` | No | `migrations` or a path under it. Requires `migrations.register`. |
| `contributions` | No | Static navigation, pages, settings, fields, workflows, events, and routes. |

Examples:

- Generic SDK sample: [`examples/extensions/sample-notes/`](../examples/extensions/sample-notes/)
- Extension for Root CRM (`openext-crm-suite`): [`examples/extensions/crm-follow-up-notes/`](../examples/extensions/crm-follow-up-notes/)

## Capabilities

- `navigation.register`
- `ui.page.register`
- `api.register`
- `events.subscribe`
- `settings.register`
- `fields.register`
- `workflows.register`
- `lifecycle.register`
- `migrations.register`

A contribution is rejected unless the matching capability is declared. The target plugin must advertise every requested capability.

## Compatibility policy

Semantic versioning is required.

- The target plugin record must exist and its version must satisfy `target.version`.
- The target must currently have registered an extension host, which means the plugin is loaded and exports `extensionHost`.
- `compatibility.cms` must include this CMS version.
- `compatibility.extensionSdk` must intersect the host range and include SDK `1.0.0`.
- Dependencies must already be installed at a satisfying version. They are not upgraded automatically.
- Enabling requires every dependency to be enabled. Disabling or uninstalling an extension is rejected while another installed extension depends on it.
- Circular dependencies are rejected.
- A new ZIP for an installed id must use a higher version. Same-version reinstall is rejected; use rollback or uninstall first.
- An id that is already `installed`, `enabled`, or `disabled` cannot be installed again.

## Permissions

Requested permissions are stored at install and are not granted. An administrator with `plugins.manage` approves a subset on the extension detail page. The server rejects any permission the package did not request. Extension code has no API to approve permissions.

`permissions.has()` inside a trusted backend only sees approved permissions.

## Trust and code execution

Manifest validation is not a sandbox.

- Upload, validate, install, and static enable do not execute package code.
- `entry.backend` and migrations run only after an administrator sets trusted execution to `approved`.
- Trusted code runs in-process with the same class of risk as an uploaded plugin backend. There is no VM isolation that can contain a malicious package. Install trusted packages only from publishers you have reviewed.
- The extension context exposes logging, approved-permission checks, and the capabilities the host granted. It does not expose environment variables, the filesystem, database credentials, or permission approval.
- A trusted migration can register a namespaced model through `ctx.models.register`. That is still trusted code.

If trust is pending, enable registers static contributions and leaves the backend unloaded.

## Lifecycle

States: `installed`, `enabled`, `disabled`, `failed`, `uninstalled`.

```text
installed → enabled → disabled → enabled
installed|enabled|disabled → uninstalled → installed
failed → installed
```

There is no second boolean for “active”. `enabled` is the only active state.

| Action | Result |
| --- | --- |
| Upload | Stores the ZIP in staging when the archive is structurally safe. |
| Validate | Re-checks a staged ZIP. Does not install it. |
| Install | Writes `src/extension-packages/{id}/versions/{version}` and a registry row with status `installed`. |
| Enable | Registers with the target host after compatibility, dependency, and permission checks. Sets `enabled` only after registration succeeds. |
| Disable | Removes registrations. Keeps files and data. |
| Update | Stores the new version beside the old one. Clears trust when the checksum changes and disables the extension if it was enabled, so new code does not keep running. |
| Roll back | Points `current.json` at `previousVersion`. Does not run `down()`. Trust returns to pending. |
| Uninstall | Deletes extension files and marks `uninstalled`. Migration history is kept unless the administrator sets `confirmDeleteData`. User tables are never dropped. |

Operations take an in-process lock plus a database lock when the row exists. A second request receives HTTP 409. Failed installs delete the version directory they created. A failed update restores the previous current pointer.

Storage is outside `public/`. Backend files are not served. UI and asset files are served only to authenticated dashboard users from `/extensions/{id}/...`.

## Migrations and data retention

Migration files export `{ name?, up(ctx), down?(ctx) }`. `up` runs once per extension and migration name. The name is stored in `extension_migrations`. `down` is never called automatically. If a newer migration ran and a later step failed, the failure is recorded and the previous package pointer is restored, but applied migrations stay applied. Restore from backup when a migration cannot be reversed safely.

Uninstall does not drop collections.

## Target plugin integration

Existing plugins keep working if they do not export `extensionHost`. To opt in, add this to the plugin server module:

```js
module.exports = {
  register() {},
  extensionHost: {
    pluginId: 'your-plugin-id',
    sdkVersion: '^1.0.0',
    capabilities: [
      'navigation.register',
      'ui.page.register',
      'settings.register',
    ],
    async registerExtension(registration) {
      // registration.extensionId, contributions, capabilities, permissions
    },
    async unregisterExtension(extensionId) {},
  },
};
```

The host `pluginId` must match the plugin id. The CMS calls `registerExtension` on enable and again after a process restart for extensions that are still enabled. Implement it so a second call replaces the first. Enforce your own authorization inside the host. The extension cannot bypass it.

In-repo TypeScript can wrap the object with `defineExtensionHost()` from `@/lib/extensions`.

Do not put product concepts such as invoices, carts, or form fields into the CMS extension service. Those belong in the target plugin’s `registerExtension`.

## HTTP API

All routes require a logged-in dashboard user. Reads accept `plugins.view` or `plugins.manage`. Writes require `plugins.manage`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/dashboard/extensions` | List extensions |
| POST | `/api/dashboard/extensions` | Upload ZIP (`file`) |
| POST | `/api/dashboard/extensions/validate` | `{ stagingId }` |
| POST | `/api/dashboard/extensions/install` | `{ stagingId }` |
| GET | `/api/dashboard/extensions/hosts` | Plugins currently advertising a host |
| GET | `/api/dashboard/extensions/:extensionId` | Detail, manifest, history |
| POST | `/api/dashboard/extensions/:extensionId/enable` | Enable |
| POST | `/api/dashboard/extensions/:extensionId/disable` | Disable |
| POST | `/api/dashboard/extensions/:extensionId/update` | ZIP update |
| POST | `/api/dashboard/extensions/:extensionId/uninstall` | `{ confirmDeleteData? }` |
| POST | `/api/dashboard/extensions/:extensionId/rollback` | Restore previous version |
| POST | `/api/dashboard/extensions/:extensionId/permissions` | `{ approve, trustedExecution? }` |
| GET | `/api/dashboard/extensions/:extensionId/compatibility` | Target, dependencies, dependents |
| GET | `/api/dashboard/extensions/:extensionId/history` | History entries |
| GET | `/api/dashboard/extensions/:extensionId/health` | Health and migration diagnostics |

Errors use `{ message, code, errors }` and do not include stack traces.

## Database

New collections on the existing user database connection. No second database engine. No tenant id column: this CMS isolates tenants by database connection, and extension queries use that same connection.

- `plugin_extensions` — registry, unique `extensionId`
- `extension_migrations` — unique `(extensionId, migration)`

Plugin documents and `plugin_migrations` are not modified.

## Tenancy

Extension rows live on the current user-database connection, the same scope as installed plugins. The asset and management routes do not accept a tenant id from the client. One connection cannot read another tenant’s extension rows.

## Diagnostics

Lifecycle events are written as single-line JSON with `scope: "extension"`. Field names that look like passwords, tokens, cookies, or API keys are redacted. The admin UI shows `lastError`, history, migration status, and health. Stack traces stay on the server.

## Building a ZIP

```powershell
Compress-Archive -Path .\my-extension\* -DestinationPath .\my-extension.zip -Force
```

The `*` keeps `manifest.json` at the root. You may zip either compiled `.js` or TypeScript `.ts` / `.tsx`. The CMS transpiles TypeScript during install. Packages with npm imports should still be built before upload.

## Rollback of the CMS code

1. Stop the CMS.
2. Deploy the previous CMS revision. Extension collections can remain; older code ignores them.
3. Installed extension files under `src/extension-packages/` are unused by the old revision and can be deleted after you no longer need them.
4. Do not drop `plugin_extensions` until you have exported anything you still need. Dropping it does not affect complete plugins.
5. Complete plugin packages under `src/plugins/` are not part of this change.

## Known limits

- Trusted backend code is not sandboxed.
- Migration `down()` is not automatic.
- A target plugin must be enabled and must have registered its host before an extension for it can be installed.
- The operation lock is reliable in one Node process. Two processes installing the same new id rely on the unique `extensionId` index.
- Plugins that do not export `extensionHost` cannot receive extensions. They otherwise behave as before.
