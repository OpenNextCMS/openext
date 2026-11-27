# Uploaded plugins — NOT in public/

Plugin ZIP packages are stored under `src/`, **never** under `public/plugins/`.

```
src/plugins/{pluginId}/{pluginId}/ui/
src/app/api/plugins/[pluginId]/{pluginId}/api/
```

Browser URLs `/plugins/{pluginId}/...` are served by a Next.js route, not static files from `public/`.

Override with env: `PLUGINS_FRONTEND_DIR`, `PLUGINS_BACKEND_DIR` (must not point inside `public/`).
