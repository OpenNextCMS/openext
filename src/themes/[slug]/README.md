# Uploaded themes — NOT in public/

Theme Engine ZIP packages are stored here, **never** under `public/`:

```
src/themes/[slug]/aura-coffee/theme.json
```

Assets are served via `/theme-engine-assets/{slug}/...` (controlled route).

Override with env: `THEME_ENGINE_THEMES_DIR` (must not point inside `public/`).
