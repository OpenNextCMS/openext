# How to Build Plugin Extensions

This guide explains, in plain steps:

1. How to make an **extension folder**
2. What **code** goes in that folder
3. What an **existing plugin** must have to accept extensions
4. How an enabled extension **changes** that plugin at runtime

---

## Big picture

```text
┌─────────────────────────────┐
│  Complete plugin            │  e.g. openext-crm-suite
│  (Dashboard → Plugins)      │
│                             │
│  exports extensionHost      │◄── required to receive extensions
└──────────────▲──────────────┘
               │
               │ CMS calls registerExtension()
               │ when extension is enabled
               │
┌──────────────┴──────────────┐
│  Extension package          │  e.g. crm-follow-up-notes
│  (Dashboard → Extensions)   │
│  type: plugin-extension     │
│  target.pluginId: crm id    │
└─────────────────────────────┘
```

| | Complete plugin | Extension |
| --- | --- | --- |
| Upload page | **Plugins** | **Extensions** |
| Manifest | `kind: system` or `block` | `type: plugin-extension` |
| Purpose | Full product | Add-on for one plugin |
| Alone | Works by itself | Needs its target plugin installed + enabled + hosting |

An extension does **not** replace the plugin. It contributes nav items, pages, fields, workflows, etc. The **plugin** decides how to show and use those contributions.

---

## 1. How to make the extension folder

Create a folder on disk (any name). Example:

```text
crm-follow-up-notes/
├── manifest.json                 ← required (always)
├── README.md                     ← optional
├── ui/
│   ├── pages/
│   │   └── follow-ups.html       ← optional full pages (sidebar)
│   ├── fields/
│   │   └── calc.js               ← optional field logic (auto-calc, etc.)
│   └── flow.json                 ← optional flow / form config (adjust without CRM edits)
├── assets/                       ← optional images / fonts / css / extra JSON
├── server/
│   └── index.js                  ← optional backend (.ts also ok)
└── migrations/                   ← optional DB scripts (trusted only)
```

### Rules

- **Only `manifest.json` is mandatory.**
- Add `ui/`, `server/`, `migrations/`, `assets/` only when you need them.
- Paths in the manifest must be relative and safe (`ui/pages/x.html`, not `../x`).
- `.json` under `ui/` or `assets/` is allowed — use it for adjustable flow/config.
- Production may ship `.js` or `.ts` / `.tsx`. The CMS transpiles TypeScript on install.
- Do **not** include `node_modules`, `.env`, `.git`, or executables.
- Zip so `manifest.json` is at the ZIP root (or inside one wrapper folder).

### Create the ZIP (PowerShell)

```powershell
cd crm-follow-up-notes
Compress-Archive -Path .\* -DestinationPath ..\crm-follow-up-notes.zip -Force
```

Upload that ZIP from **Dashboard → Extensions** (not Plugins).

---

## 2. What code goes in the extension folder

### 2.1 `manifest.json` (required)

This tells the CMS **which plugin** you extend and **what you contribute**.

```json
{
  "manifestVersion": 1,
  "id": "crm-follow-up-notes",
  "name": "CRM Follow-up Notes",
  "version": "1.0.0",
  "type": "plugin-extension",
  "description": "Adds a Follow-ups page to Root CRM.",
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
    "frontend": "ui/pages/follow-ups.html",
    "backend": "server/index.js",
    "flow": "ui/flow.json"
  },

  "capabilities": [
    "navigation.register",
    "ui.page.register",
    "fields.register",
    "lifecycle.register"
  ],

  "permissions": ["crm.followups.read"],

  "dependencies": [],

  "contributions": {
    "navigation": [
      {
        "id": "follow-ups",
        "label": "Follow-ups",
        "href": "ui/pages/follow-ups.html"
      }
    ],
    "pages": [
      {
        "id": "follow-ups",
        "title": "Follow-up Notes",
        "entry": "ui/pages/follow-ups.html"
      }
    ]
  }
}
```

#### Field meanings

| Field | Meaning |
| --- | --- |
| `id` | Stable extension id. Do not change between versions. |
| `type` | Must be exactly `plugin-extension`. |
| `target.pluginId` | The plugin this extends (must match that plugin’s `manifest.id`). |
| `target.version` | Version range for that plugin, e.g. `^2.0.0`. |
| `capabilities` | What you ask the host to support. Must be advertised by the plugin host. |
| `permissions` | Requested permissions. Admins approve them; they are not auto-granted. |
| `contributions` | Static declarations (nav, pages, fields, …) applied when the extension is enabled. |
| `entry.frontend` | Optional UI file under `ui/` or `assets/`. |
| `entry.backend` | Optional server file under `server/` (`.js` or `.ts`). |
| `entry.flow` | Optional flow/config JSON under `ui/` or `assets/` (e.g. `ui/flow.json`). Host loads this to adjust sections, formulas, and steps **from the extension only**. |

### 2.2 UI page (optional) — mount module for the dashboard

Dashboard extension pages must ship an **ESM mount module** (not HTML-in-iframe):

```text
ui/pages/follow-ups.js
```

Declare it in `contributions.pages[].entry` / `navigation[].href`. The CMS sidebar opens it in the **same** `#plugin-root` as the host plugin (no iframe).

```js
// ui/pages/follow-ups.js
export async function mount(el, ctx) {
  el.innerHTML = `<h1>Follow-up Notes</h1><p>Extension for ${ctx.pluginId}</p>`;
  return { unmount() { el.replaceChildren(); } };
}
```

HTML under `ui/pages/*.html` may still be packaged as static assets, but it is **not** opened as a dashboard page.

### 2.3 Backend (optional) — `server/index.js`

Runs **only** after:

1. Admin installs the extension  
2. Admin approves permissions  
3. Admin approves **trusted execution**  
4. Admin **enables** the extension  

```js
module.exports = {
  async register(context) {
    context.logger.info('crm-follow-up-notes registered', {
      targetPluginId: context.targetPluginId
    });

    // Only sees permissions the admin approved
    if (context.permissions.has('crm.followups.read')) {
      context.navigation.register({
        id: 'follow-ups-runtime',
        label: 'Follow-ups',
        href: 'ui/pages/follow-ups.html'
      });
    }
  },

  async shutdown() {
    // Optional cleanup
  }
};
```

`context` is limited. It does **not** give full CMS database credentials, filesystem, or permission-approval APIs.

You may use `server/index.ts` instead; set `"entry.backend": "server/index.ts"`. The CMS compiles it on install.

### 2.4 Flow / form config JSON — adjust the flow from the extension

Ship a JSON file in the extension (recommended path: `ui/flow.json`) and point to it from the manifest:

```json
"entry": {
  "flow": "ui/flow.json"
}
```

The host loads that JSON when the extension is enabled. **To change sections, order, formulas, or steps, edit this JSON and update the extension** — do not change CRM.

Example `ui/flow.json`:

```json
{
  "version": 1,
  "mount": "lead.create",
  "sections": [
    {
      "id": "travel-general",
      "title": "G. Travel General Information",
      "fields": ["enquiryDate", "preparedBy"]
    },
    {
      "id": "traveller-details",
      "title": "H. Traveller Details",
      "fields": ["adults", "children", "infants", "totalTravellers"]
    },
    {
      "id": "travel-information",
      "title": "I. Travel Information",
      "fields": ["from", "to", "destination", "travelStartDate", "travelEndDate", "numberOfDays", "travelMonth", "dateFlexibility"]
    }
  ],
  "fields": {
    "adults": { "label": "Adults", "type": "number", "required": true, "default": 1 },
    "children": { "label": "Children", "type": "number", "default": 0 },
    "infants": { "label": "Infants", "type": "number", "default": 0 },
    "totalTravellers": { "label": "Total Travellers", "type": "number", "readOnly": true },
    "travelStartDate": { "label": "Travel Start Date", "type": "date" },
    "travelEndDate": { "label": "Travel End Date", "type": "date" },
    "numberOfDays": { "label": "Number of Days", "type": "number", "readOnly": true },
    "travelMonth": { "label": "Travel Month", "type": "string", "readOnly": true }
  },
  "formulas": [
    {
      "target": "totalTravellers",
      "expr": "number(adults) + number(children) + number(infants)",
      "when": ["adults", "children", "infants"]
    },
    {
      "target": "numberOfDays",
      "expr": "daysBetween(travelStartDate, travelEndDate)",
      "when": ["travelStartDate", "travelEndDate"]
    },
    {
      "target": "travelMonth",
      "expr": "monthName(travelStartDate)",
      "when": ["travelStartDate"]
    }
  ],
  "storage": {
    "path": "extension.crm-travel"
  }
}
```

Served at:

```text
/extensions/{extensionId}/ui/flow.json
```

(same public rules as other `ui/` / `assets/` files).

Adjust the flow later by changing this JSON (add a section, reorder fields, change a formula) → re-zip → update the extension. CRM stays the same.

You may also keep extra JSON under `assets/` (lookups, option lists) and reference those paths from `flow.json`.

### 2.5 Field logic (auto-calc, validation) — lives in the **extension only**

Prefer declaring formulas in **`ui/flow.json`** (above) so the generic host can apply them without CRM-specific code.

Optional JS for cases JSON cannot express:

- `ui/fields/calc.js` — custom live logic when the user types  
- `server/index.js` — same rules on save so the database stays correct  

Do **not** put Travel (or any product-specific) formulas inside the CRM Create Lead source.

Example extension-owned calculator (only if you need more than `flow.json` formulas):

```js
// ui/fields/calc.js — owned by the extension, not by CRM
export function onFieldChange(values, _changedKey) {
  const adults = Number(values.adults) || 0;
  const children = Number(values.children) || 0;
  const infants = Number(values.infants) || 0;
  return {
    ...values,
    totalTravellers: adults + children + infants
  };
}
```

You can still list fields in the manifest for discovery:

```json
"capabilities": ["fields.register"],
"contributions": {
  "fields": [
    { "id": "adults", "label": "Adults", "fieldType": "number" },
    { "id": "children", "label": "Children", "fieldType": "number" },
    { "id": "infants", "label": "Infants", "fieldType": "number" },
    { "id": "totalTravellers", "label": "Total Travellers", "fieldType": "number" }
  ]
}
```

Detailed layout, defaults, and formulas should live in **`ui/flow.json`** so the flow is adjustable from the extension package alone.

| Piece | Where it lives |
| --- | --- |
| Field names (discovery) | Extension `manifest.json` → `contributions.fields` |
| Sections, order, defaults, formulas, flow | Extension `ui/flow.json` (`entry.flow`) |
| Custom client logic beyond JSON | Extension `ui/fields/*.js` |
| Server-side recalc / enforce on save | Extension `server/index.js` |
| CRM / host | Generic slot — load `entry.flow`, render sections/fields, evaluate formulas. **No product formulas in CRM.** |

### 2.6 Migrations (optional) — `migrations/`

Only for trusted extensions that need DB setup. Requires capability `migrations.register`. Uninstall does **not** drop user tables by default.

---

## 3. What the plugin must have

An already-made plugin works without extensions. To **accept** extensions, add an `extensionHost` to its server entry.

### 3.1 Where

In the plugin package (example CRM):

```text
openext-crm-suite/
├── manifest.json          id: "openext-crm-suite"
└── api/
    ├── index.js           exports extensionHost
    └── extension-host.js  host implementation (recommended separate file)
```

`manifest.json` `id` and `extensionHost.pluginId` must be the **same string**.

### 3.2 Host code the plugin should include

```js
// api/extension-host.js
'use strict';

const registeredExtensions = new Map();

const extensionHost = {
  pluginId: 'openext-crm-suite', // MUST match plugin manifest.id
  sdkVersion: '^1.0.0',
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
    // Called by CMS when an extension targeting this plugin is enabled
    registeredExtensions.set(registration.extensionId, registration);

    // Host is GENERIC only:
    // - load entry.flow (ui/flow.json) when present
    // - render sections/fields from that JSON; evaluate formulas
    // - optional: call ui/fields calc if the extension ships one
    // Do NOT hardcode Travel (or any extension) formulas here.
    // Pages and navigation are shown by the CMS in the plugin sidebar. Do not iframe them.
  },

  async unregisterExtension(extensionId) {
    registeredExtensions.delete(extensionId);
    // Drop this extension's field slot; do not leave host-specific calc behind.
  }
};

module.exports = {
  extensionHost,
  listRegisteredExtensions: () => [...registeredExtensions.values()]
};
```

Export it from the server entry:

```js
// api/index.js
const { extensionHost, listRegisteredExtensions } = require('./extension-host');

module.exports = {
  extensionHost, // required for hosting

  async register({ app, cms }) {
    // existing plugin routes/middleware…

    // optional helper for debugging
    app.get('/extensions', async (_req, res) => {
      res.json({ success: true, data: listRegisteredExtensions() });
    });
  },

  async boot() {},
  shutdown() {}
};
```

### 3.3 Plugin checklist

- [ ] Plugin id is stable (`manifest.id`)
- [ ] `extensionHost.pluginId` equals that id
- [ ] `capabilities` list only what you really handle
- [ ] `registerExtension` is idempotent (safe after CMS restart)
- [ ] `unregisterExtension` removes what you added
- [ ] Plugin is **enabled** in Dashboard → Plugins
- [ ] Host shows up in `GET /api/dashboard/extensions/hosts`

If `extensionHost` is missing, the plugin still works. Extensions for it simply cannot install.

---

## 4. How the extension changes the plugin

The CMS does **not** rewrite the plugin’s source files on disk.

Flow when an admin enables an extension:

```text
1. Admin uploads extension ZIP → CMS validates & stores it
2. Admin approves permissions (and trust if backend exists)
3. Admin clicks Enable
4. CMS finds host for target.pluginId  (e.g. openext-crm-suite)
5. CMS calls host.registerExtension(registration)
6. Plugin updates its in-memory registry / UI / hooks
7. Optional: CMS loads server/index.js with a limited context
```

### What the plugin receives

```js
{
  extensionId: 'crm-follow-up-notes',
  version: '1.0.0',
  targetPluginId: 'openext-crm-suite',
  capabilities: ['navigation.register', 'ui.page.register', 'lifecycle.register'],
  permissions: ['crm.followups.read'], // approved only
  contributions: {
    navigation: [{ id: 'follow-ups', label: 'Follow-ups', href: 'ui/pages/follow-ups.html' }],
    pages: [{ id: 'follow-ups', title: 'Follow-up Notes', entry: 'ui/pages/follow-ups.html' }]
  },
  entry: {
    frontend: 'ui/pages/follow-ups.html',
    backend: 'server/index.js'
  }
}
```

### What “change” means in practice

| Contribution | Typical plugin reaction |
| --- | --- |
| `navigation` | CMS adds the item under the target plugin in the dashboard sidebar |
| `pages` | CMS mounts the page’s **JS module** into `#plugin-root` (same div as the host plugin). Entry must be `.js` / `.mjs` / `.ts` exporting `mount` |
| `fields` | Host mounts a **generic** field slot on Create Lead / Edit Lead. Prefer driving layout + formulas from extension `ui/flow.json`. Values save under `record.extension[extensionId]` |
| `workflows` | Hook into save / status-change pipelines |
| `settings` | Show extra settings keys in plugin settings |
| `api.register` | Allow extension-declared routes (if your host supports it) |

Example page URL after install:

```text
/extensions/crm-follow-up-notes/ui/pages/follow-ups.html
```

### Form fields on Create Lead — extension owns the logic

Wrong — nested iframe (scrollbar inside scrollbar):

```text
Dashboard
  └── Plugin iframe (CRM React)
        └── Create Lead (sections A–F native)
              └── ExtensionIframe  ← travel-lead-form.html   ❌ second frame
```

Wrong — formulas hard-coded in CRM:

```js
// ❌ Do not put this in CRM Create Lead
totalTravellers = adults + children + infants;
```

Right — same form, **generic host**, **extension-owned flow JSON + calc**:

```text
Dashboard
  └── Plugin iframe (CRM React)
        └── Create Lead
              ├── A–F native CRM fields
              └── Extension fields slot (generic)
                    ├── load entry.flow → ui/flow.json
                    ├── render sections / fields from JSON
                    └── on change → apply formulas from JSON (or ui/fields/calc.js)  ✅
```

Rules:

1. **`ui.page.register` / `pages`** — full screens from the CMS sidebar. CMS mounts the extension’s JS module into `#plugin-root` (no plugin iframe, no nested iframe).
2. **`fields.register` + `entry.flow`** — fields inside Create Lead / Edit Lead. Host renders a generic slot in the **same** document. Layout, order, and formulas come from **`ui/flow.json`** in the extension.
3. **CRM must not contain product-specific field formulas or section layouts.** To adjust the flow, edit `ui/flow.json` (and optional calc JS), then update the extension.
4. Never iframe an extension page inside Create Lead or for dashboard plugin display.

On **Disable**, CMS calls `unregisterExtension(extensionId)`. The plugin should remove those contributions. Extension files stay on disk until uninstall.

On **Uninstall**, CMS removes extension files and registry row. Plugin-owned user data is not dropped unless you deliberately clean it in your own uninstall logic.

---

## 5. End-to-end example (CRM)

### Extension folder

```text
crm-follow-up-notes/
├── manifest.json          target.pluginId = "openext-crm-suite"
├── ui/pages/follow-ups.html
└── server/index.js
```

### Plugin side

```text
openext-crm-suite/
└── api/
    ├── index.js           exports extensionHost
    └── extension-host.js
```

### Admin steps

1. Install + enable `openext-crm-suite`
2. Confirm host: `GET /api/dashboard/extensions/hosts`
3. Zip and upload `crm-follow-up-notes` on **Dashboard → Extensions**
4. Install → approve `crm.followups.read` → approve trust (if you want backend) → Enable
5. CRM `registerExtension` runs; optional `GET /api/plugins/openext-crm-suite/extensions` lists it

Working samples in this repo:

- `examples/extensions/crm-follow-up-notes/`
- `examples/extensions/sample-notes/`
- Full reference: [Extension Developer Guide](./extension-developer-guide.md)
- Schema / security: [Extension Management](./extension-management.md)

---

## 6. Common mistakes

| Mistake | Fix |
| --- | --- |
| Upload extension on Plugins page | Use **Extensions** |
| `type` not `plugin-extension` | Set exactly that value |
| Wrong `target.pluginId` | Must match plugin `manifest.id` |
| Plugin has no `extensionHost` | Add and export it; enable the plugin |
| Capability not in host list | Add it to host `capabilities` or remove from extension |
| Expect backend to run after install only | Approve trust + Enable |
| Expect CMS to auto-edit CRM React screens | Host applies contributions via a generic slot; pages come from the CMS sidebar |
| Put Travel fields in Create Lead via nested `ExtensionIframe` | Use a generic fields slot in the same form; keep HTML pages for sidebar-only screens |
| Put auto-calc / field rules inside CRM Create Lead | Put them in the extension (`ui/flow.json`, optional `ui/fields/*.js`, and/or `server/index.js`) |
| Expect `manifest.json` alone to calculate fields | Manifest declares fields + `entry.flow`; formulas live in `ui/flow.json` |
| Hard-code section order / formulas in CRM to “support” Travel | Put adjustable flow in extension `ui/flow.json` and re-upload when it changes |

---

## Short summary

1. **Make a folder** with at least `manifest.json` (`type: plugin-extension`, `target.pluginId`, contributions).
2. **Add UI/backend/field-logic/flow JSON** only as needed; zip and upload on Extensions.
3. **Plugin must export `extensionHost`** with matching `pluginId` and register/unregister handlers — host stays **generic** (no product formulas).
4. **Adjustable flow lives in the extension** as `ui/flow.json` (`entry.flow`). Optional calc JS / server code for rules JSON cannot express.
5. **Enable** causes CMS to call `registerExtension` — that is how the extension changes the plugin (in memory / product UI), not by rewriting plugin ZIP contents.
