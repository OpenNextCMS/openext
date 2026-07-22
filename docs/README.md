# Documentation

| Doc | Description |
| --- | --- |
| [Plugin ZIP Upload Format](./plugin-upload-format.md) | **Start here** — ZIP structure, manifest, upload lifecycle, frontend + backend packages |
| [Plugin Backend Architecture](./plugin-backend-architecture.md) | Server module contract, SDK, migrations, routes, security |
| [Theme Uploading](./theme-upload-format.md) | Theme packages — activate/apply checklist, token vs package upload |
| [Theme Engine Package Format](./theme-engine-editable-sections.md) | React/TSX themes for **Theme Engine (Beta)** — ZIP structure, validation, editable sections |
| [Theme Registration (`theme.ts`)](./theme-registration.md) | **`theme.ts` bootstrap API** — `defineTheme`, auto-discovery, hooks, commands, registry |
| [Theme Package Manager](./theme-package-manager.md) | Full ZIP architecture, DB fields, assets, security internals |
| [Theme Builder](./theme-builder.md) | In-app token editor, CSS variables, component variants |

Project overview: [`../PROJECT.md`](../PROJECT.md).

Sample plugin packages: [`../examples/crm-plugin/`](../examples/crm-plugin/), [`../examples/notes-plugin/`](../examples/notes-plugin/).

Sample full theme packages: [`../examples/business-theme/`](../examples/business-theme/), [`../examples/meridian-theme/`](../examples/meridian-theme/).

Built-in Theme Engine default: [`../src/modules/themeEngine/default-theme-source/`](../src/modules/themeEngine/default-theme-source/).

Brunch restaurant theme (reference package): [`../theme-packages/brunch/`](../theme-packages/brunch/).
