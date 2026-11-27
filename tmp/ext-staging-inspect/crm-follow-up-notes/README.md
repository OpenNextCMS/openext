# CRM Follow-up Notes (extension)

Sample **plugin-extension** for **Root CRM** (`openext-crm-suite` v2.x).

This is not a complete plugin ZIP. Upload it from the CMS **Dashboard → Extensions** page.

## Package contents

```text
crm-follow-up-notes/
├── manifest.json
├── README.md
├── ui/pages/follow-ups.html
└── server/index.js
```

Key manifest fields:

| Field | Value |
| --- | --- |
| `type` | `plugin-extension` |
| `id` | `crm-follow-up-notes` |
| `target.pluginId` | `openext-crm-suite` |
| `target.version` | `^2.0.0` |
| `compatibility.extensionSdk` | `^1.0.0` |

## Prerequisites

1. Install and **enable** `openext-crm-suite` in Dashboard → Plugins.
2. Rebuild/re-upload the CRM plugin so `api/index.js` exports `extensionHost` (included in this repo under `api/extension-host.js`).
3. Confirm the host is visible: `GET /api/dashboard/extensions/hosts` should list `openext-crm-suite`.

## Build the ZIP

From this folder:

```powershell
Compress-Archive `
  -Path .\* `
  -DestinationPath ..\crm-follow-up-notes.zip `
  -Force
```

`manifest.json` must be at the ZIP root (or inside one wrapper folder).

## Install in the CMS

1. Dashboard → **Extensions** → upload `crm-follow-up-notes.zip`
2. Review validation (target plugin, capabilities, permissions)
3. **Install**
4. On the extension detail page:
   - Approve permission `crm.followups.read`
   - Optionally **Approve trust** if you want `server/index.js` to run
5. **Enable**

## Verify

- Extension status becomes `enabled`
- CRM API `GET /api/plugins/openext-crm-suite/extensions` returns this registration
- Open the page asset (while logged into the dashboard):

```text
/extensions/crm-follow-up-notes/ui/pages/follow-ups.html
```

## TypeScript variant

You may replace `server/index.js` with `server/index.ts` and set:

```json
"entry": { "backend": "server/index.ts" }
```

The CMS transpiles TypeScript on install. Keep the compiled-or-source package free of `node_modules`.
