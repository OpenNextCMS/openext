# Plugin ZIP Upload Format

This document defines the plugin package format accepted by:

```text
Dashboard → Plugins → Upload Plugin
```

Uploaded plugins are static browser packages. The CMS supports:

1. **Block plugins** — components placed on the visual page-editor canvas.
2. **System plugins** — dashboard applications such as CRM, analytics, or administration tools.
3. **Hybrid system plugins** — a dashboard application with an optional editor block.

## Important runtime limitation

The ZIP installer does not execute a plugin backend.

Supported:

- Compiled HTML, CSS, and browser JavaScript.
- Images, fonts, icons, and JSON assets.
- Dashboard applications rendered in a sandboxed iframe.
- Page-editor blocks mounted through JavaScript.
- Authenticated JSON storage through the CMS plugin-data API.

Not supported directly from a ZIP:

- Node.js, PHP, Python, Java, or other server processes.
- TypeScript, JSX, React, or Vue source that has not been built.
- Custom API route installation.
- Database migrations or custom database models.
- npm dependency installation at upload time.
- Executable or shell files.

Build frontend source before creating the ZIP.

---

## 1. System plugin structure

Use a system plugin for a CRM, analytics dashboard, inventory manager, or other dashboard application.

```text
crm-plugin/
├── manifest.json                  Required
├── admin/
│   ├── index.html                Required entry
│   ├── app.js
│   └── style.css
├── assets/
│   ├── logo.svg
│   └── avatar-placeholder.webp
└── fonts/
    └── inter.woff2
```

The ZIP can contain these files directly:

```text
crm-plugin.zip
├── manifest.json
├── admin/
└── assets/
```

It may also contain one wrapper directory:

```text
crm-plugin.zip
└── crm-plugin/
    ├── manifest.json
    ├── admin/
    └── assets/
```

### System plugin manifest

```json
{
  "id": "crm-plugin",
  "name": "CRM",
  "version": "1.0.0",
  "description": "Customer relationship management dashboard",
  "author": "Your Company",
  "kind": "system",
  "type": "crm",
  "icon": "👥",
  "adminEntry": "admin/index.html",
  "styles": []
}
```

If `adminEntry` is omitted, the installer looks for:

```text
admin/index.html
dashboard/index.html
```

The dashboard opens the admin entry inside a same-origin iframe with:

```text
allow-scripts allow-same-origin allow-forms allow-popups
```

### Minimal `admin/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CRM</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main id="app">
      <h1>CRM</h1>
      <p id="status">Loading contacts…</p>
      <ul id="contacts"></ul>
    </main>
    <script src="./app.js"></script>
  </body>
</html>
```

### Minimal `admin/app.js`

```js
const pluginId = 'crm-plugin';

async function loadContacts() {
  const response = await fetch(`/api/plugins/${pluginId}/data/contacts`, {
    credentials: 'include'
  });

  if (response.status === 404) {
    document.querySelector('#status').textContent = 'No contacts yet.';
    return;
  }

  if (!response.ok) {
    throw new Error(`Unable to load contacts (${response.status})`);
  }

  const payload = await response.json();
  const contacts = payload.data?.data || [];

  document.querySelector('#status').textContent = `${contacts.length} contacts`;
  document.querySelector('#contacts').innerHTML = contacts
    .map((contact) => `<li>${escapeHtml(contact.name)} — ${escapeHtml(contact.email)}</li>`)
    .join('');
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = String(value || '');
  return element.innerHTML;
}

loadContacts().catch((error) => {
  document.querySelector('#status').textContent = error.message;
});
```

Never interpolate untrusted text into HTML without escaping or sanitizing it.

---

## 2. Block plugin structure

Use a block plugin for a component that users can add to the page editor.

```text
testimonial-block/
├── manifest.json                Required
├── index.js                     Required by default
├── style.css                    Optional
└── assets/
    └── quote.svg
```

### Block plugin manifest

```json
{
  "id": "testimonial-block",
  "name": "Testimonial Block",
  "version": "1.0.0",
  "description": "Editable testimonial display",
  "author": "Your Company",
  "kind": "block",
  "type": "testimonial",
  "icon": "💬",
  "entryPoint": "index.js",
  "styles": ["style.css"]
}
```

If `entryPoint` is omitted for a block plugin, it defaults to:

```text
index.js
```

The entry file and every declared stylesheet must exist.

## 3. Block JavaScript contract

There are two supported mounting approaches.

### Option A: CMS plugin registry

Register the plugin by its exact manifest ID:

```js
window.__NEXTCMS_PLUGINS__ = window.__NEXTCMS_PLUGINS__ || {};

window.__NEXTCMS_PLUGINS__['testimonial-block'] = {
  mount(element, context) {
    const block = context.block || {};
    const data = block.data || {};

    element.innerHTML = '';

    const article = document.createElement('article');
    article.className = 'testimonial-plugin';

    const quote = document.createElement('blockquote');
    quote.textContent = data.quote || 'Your testimonial';

    const author = document.createElement('p');
    author.textContent = data.author || 'Customer name';

    article.append(quote, author);
    element.appendChild(article);
  },

  unmount(element) {
    element.innerHTML = '';
  }
};
```

`mount(element, context)` receives:

```js
{
  block: {},        // CMS block data
  isEditing: true   // true inside the page editor
}
```

Use DOM APIs and `textContent` for user-provided values. Avoid injecting unsafe HTML.

### Option B: Custom element

Manifest:

```json
{
  "id": "testimonial-block",
  "name": "Testimonial Block",
  "version": "1.0.0",
  "kind": "block",
  "entryPoint": "index.js",
  "customElement": "nextcms-testimonial"
}
```

Entry:

```js
class TestimonialElement extends HTMLElement {
  connectedCallback() {
    const quote = this.getAttribute('data-quote') || 'Your testimonial';
    this.textContent = quote;
  }
}

if (!customElements.get('nextcms-testimonial')) {
  customElements.define('nextcms-testimonial', TestimonialElement);
}
```

The CMS adds:

```text
data-block-id
data-plugin-id
data-editing
```

Values from `block.data` are also copied to `data-{key}` attributes.

Custom-element names must contain a hyphen.

---

## 4. Hybrid system plugin

A system plugin can also provide a page-editor block.

```text
crm-plugin/
├── manifest.json
├── admin/
│   ├── index.html
│   ├── app.js
│   └── style.css
└── block/
    ├── index.js
    └── style.css
```

Manifest:

```json
{
  "id": "crm-plugin",
  "name": "CRM",
  "version": "1.0.0",
  "kind": "system",
  "type": "crm",
  "adminEntry": "admin/index.html",
  "blockEntry": "block/index.js",
  "styles": ["block/style.css"],
  "icon": "👥"
}
```

The dashboard uses `adminEntry`; the page editor uses `blockEntry`.

If `blockEntry` is omitted, the installer checks:

```text
block/index.js
```

---

## 5. Manifest reference

```json
{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "description": "What the plugin does",
  "author": "Author or company",
  "kind": "system",
  "type": "crm",
  "icon": "🧩",
  "entryPoint": "index.js",
  "adminEntry": "admin/index.html",
  "blockEntry": "block/index.js",
  "styles": ["style.css"],
  "customElement": "vendor-plugin-name"
}
```

### Fields

- `id`: recommended; stable plugin identifier.
- `name`: required, non-empty.
- `version`: required, non-empty.
- `description`: optional.
- `author`: optional; defaults to `Unknown`.
- `kind`: `block` or `system`.
- `type`: marketplace/category label such as `crm`, `chart`, or `slider`.
- `icon`: optional emoji or short icon label.
- `entryPoint`: JavaScript entry for a block plugin.
- `adminEntry`: HTML entry for a system plugin.
- `blockEntry`: optional block JavaScript for a system plugin.
- `styles`: array of CSS files loaded for editor blocks.
- `customElement`: optional web-component tag name.

If `id` is omitted, it is generated from `name`.

Plugin IDs:

- Must be 3–64 characters.
- Must begin and end with a letter or number.
- May contain lowercase letters, numbers, `-`, and `_`.
- Should remain unchanged between versions.

Examples:

```text
crm-plugin
analytics_v2
company-contact-form
```

All declared file paths:

- Must be relative.
- Must use `/`, not `\`.
- Must not begin with `/`.
- Must not contain `.` or `..` path segments.
- Must point to an existing file in the package.

---

## 6. Plugin data API

Uploaded and enabled plugins can store authenticated JSON data.

### List all keys

```http
GET /api/plugins/{pluginId}/data
```

### Create or update a key

```http
POST /api/plugins/{pluginId}/data
Content-Type: application/json

{
  "key": "contacts",
  "data": [
    {
      "id": "contact-1",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  ]
}
```

### Read one key

```http
GET /api/plugins/{pluginId}/data/{key}
```

### Replace one key

```http
PUT /api/plugins/{pluginId}/data/{key}
Content-Type: application/json

{
  "data": {
    "value": "Example"
  }
}
```

The PUT body may also be the raw JSON value.

### Delete one key

```http
DELETE /api/plugins/{pluginId}/data/{key}
```

Data API rules:

- The user must be authenticated.
- The plugin must be installed, uploaded, and enabled.
- A data key is 1–128 characters using letters, numbers, `.`, `_`, and `-`.
- Each saved payload is limited to 256 KB.
- Plugin data is namespaced by `pluginId`.

For a large CRM, create dedicated first-party backend APIs and normalized database models. The generic plugin-data API is intended for small-to-medium configuration/data payloads, not high-volume relational CRM records.

---

## 7. Building frontend frameworks

React, Vue, Svelte, or TypeScript plugin source must be compiled before upload.

Source project:

```text
crm-source/
├── src/
├── package.json
└── vite.config.ts
```

Upload package after build:

```text
crm-plugin/
├── manifest.json
└── admin/
    ├── index.html
    ├── assets/
    │   ├── app-a1b2c3.js
    │   └── app-d4e5f6.css
    └── ...
```

Configure the bundler to generate relative asset paths. For Vite:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'plugin-package/admin',
    emptyOutDir: true
  }
});
```

Add `manifest.json` beside `admin/` after the build.

Do not include:

```text
node_modules/
src/
.env
.git/
coverage/
test output
private keys
credentials
```

---

## 8. Assets and URLs

Installed files are available at:

```text
/plugins/{pluginId}/{relativePath}
```

Inside `admin/index.html`, prefer relative URLs:

```html
<link rel="stylesheet" href="./style.css" />
<script src="./app.js"></script>
<img src="../assets/logo.svg" alt="CRM" />
```

Inside a block entry, use the installed public base:

```js
const logoUrl = '/plugins/testimonial-block/assets/logo.svg';
```

Supported served content types include:

```text
.html, .htm, .css, .js, .json,
.svg, .png, .jpg, .jpeg, .gif, .webp, .ico,
.woff, .woff2
```

Unknown non-blocked files may be served as `application/octet-stream`, but relying on that is discouraged.

---

## 9. Security and package limits

Default upload limits:

- ZIP size: 25 MB.
- Files: 200.

Blocked file extensions:

```text
.exe, .dll, .bat, .cmd, .sh, .ps1, .msi, .com, .scr
```

The extractor:

- Ignores unsafe relative paths.
- Prevents `..` traversal.
- Rejects unsafe declared entry paths.
- Requires declared entry and stylesheet files to exist.
- Writes installed package files into a plugin-specific public directory.

Plugin JavaScript runs in the browser and should be treated as trusted code. Only install packages from trusted authors.

Recommended plugin practices:

- Never embed secrets or API keys in browser files.
- Validate all user input.
- Escape text before rendering.
- Use `textContent` rather than unsafe `innerHTML`.
- Use same-origin CMS APIs with `credentials: 'include'`.
- Avoid external scripts unless they are trusted and protected by an appropriate content-security policy.
- Do not assume iframe code can access Node.js or the server filesystem.

---

## 10. Creating the ZIP

PowerShell:

```powershell
Compress-Archive `
  -Path .\crm-plugin\* `
  -DestinationPath .\crm-plugin.zip `
  -Force
```

The `*` is important: it places `manifest.json` and the package folders at the ZIP root.

You may alternatively include one wrapper folder:

```powershell
Compress-Archive `
  -Path .\crm-plugin `
  -DestinationPath .\crm-plugin.zip `
  -Force
```

Both layouts are accepted as long as the installer can locate `manifest.json`.

Before uploading, inspect the archive:

```powershell
Expand-Archive `
  -Path .\crm-plugin.zip `
  -DestinationPath .\crm-plugin-check `
  -Force

Get-ChildItem .\crm-plugin-check -Recurse
```

Confirm that:

- `manifest.json` is present.
- JSON syntax is valid.
- `name` and `version` are present.
- The plugin ID is valid.
- `adminEntry`, `entryPoint`, `blockEntry`, and styles exist.
- Built JavaScript uses browser-compatible code.
- HTML asset paths are relative.

---

## 11. Upload, enable, and open

1. Open **Dashboard → Plugins**.
2. Select or drag the `.zip` file.
3. Upload the package.
4. The plugin is installed and enabled automatically.
5. For a system plugin, open its dashboard/runtime page.
6. For a block plugin, add it from the page-editor plugin palette.

Installed package files are stored at:

```text
public/plugins/{pluginId}/
```

Plugin metadata is stored in MongoDB. Plugin data is stored separately and namespaced by plugin ID.

## Updating an installed plugin

The current uploader does not support a `replace` flag.

To update safely:

1. Export or back up important plugin data.
2. Remove the existing plugin from **Dashboard → Plugins**.
3. Increase the package version.
4. Upload the new ZIP with the same stable ID.

Removing an uploaded plugin also removes its installed files and plugin-data records. Back up data first.

---

## 12. Common errors

### `manifest.json was not found`

Cause:

- Missing manifest.
- Incorrect archive nesting.
- Wrong filename or capitalization.

Fix:

- Name it exactly `manifest.json`.
- Place it at the package root or inside one wrapper folder.

### `manifest.json requires a non-empty "name"`

Add:

```json
{
  "name": "My Plugin"
}
```

### `manifest.json requires a non-empty "version"`

Add:

```json
{
  "version": "1.0.0"
}
```

### `System plugin requires admin/index.html`

Add `admin/index.html`, `dashboard/index.html`, or explicitly set:

```json
{
  "adminEntry": "admin/index.html"
}
```

### `Block plugin requires an entryPoint`

Add the declared JavaScript file:

```json
{
  "entryPoint": "index.js"
}
```

### `Plugin package exceeds the 25MB limit`

Remove source maps, development assets, `node_modules`, videos, and unused images. Optimize media before rebuilding the ZIP.

### `Plugin is already installed`

The current uploader cannot replace an existing plugin. Remove the installed plugin before uploading the replacement. Back up plugin data first.

### Plugin uploads but the screen is blank

Check:

- `adminEntry` points to the built HTML file.
- HTML uses relative script and stylesheet URLs.
- Browser console has no JavaScript errors.
- Framework base URL is configured as `./`.
- The ZIP contains build output, not source-only files.

### Block displays “Plugin entry point is missing”

Check:

- `kind` is `block`, or a system plugin declares `blockEntry`.
- The JavaScript file exists.
- The entry path uses `/` and is relative.

### Block script loads but nothing renders

Register:

```js
window.__NEXTCMS_PLUGINS__['your-plugin-id']
```

with a `mount()` function, or declare and register a matching `customElement`.

---

## 13. Recommended CRM package

```text
crm-plugin/
├── manifest.json
├── admin/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── block/
│   ├── index.js
│   └── style.css
└── assets/
    ├── logo.svg
    └── empty-state.webp
```

```json
{
  "id": "crm-plugin",
  "name": "CRM",
  "version": "1.0.0",
  "description": "Manage contacts and customer activity",
  "author": "Your Company",
  "kind": "system",
  "type": "crm",
  "icon": "👥",
  "adminEntry": "admin/index.html",
  "blockEntry": "block/index.js",
  "styles": ["block/style.css"]
}
```

Use the admin application for contact management and the optional editor block for a lead-capture or contact-summary component.
