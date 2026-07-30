/**
 * Route map for the Theme Package Manager (Next.js App Router handlers).
 *
 * | Method | Path                              | Controller                |
 * |--------|-----------------------------------|---------------------------|
 * | GET    | /api/themes                       | ThemeCrudController       |
 * | GET    | /api/themes/:id                   | ThemeCrudController       |
 * | POST   | /api/themes/:id/install           | ThemeInstallController    |
 * | POST   | /api/themes/:id/activate          | ThemeActivationController |
 * | POST   | /api/themes/activate              | ThemeActivationController |
 * | DELETE | /api/themes/:id                   | ThemeCrudController       |
 * | PUT    | /api/themes/:id                   | ThemeCrudController       |
 * | PUT    | /api/themes/:id/update            | ThemeCrudController       |
 * | GET    | /api/themes/:id/export            | ThemeExportController     |
 * | GET    | /api/themes/:id/assets/*          | ThemeAssetController      |
 * | GET    | /theme-assets/:theme/*            | ThemeAssetController      |
 *
 * Implementation lives under src/app/api/themes/** and src/app/theme-assets/**.
 */

export const THEME_PACKAGE_ROUTES = {
  list: 'GET /api/themes',
  get: 'GET /api/themes/:id',
  install: 'POST /api/themes/:id/install',
  activate: 'POST /api/themes/:id/activate',
  activateLegacy: 'POST /api/themes/activate',
  delete: 'DELETE /api/themes/:id',
  update: 'PUT /api/themes/:id',
  updateAlias: 'PUT /api/themes/:id/update',
  export: 'GET /api/themes/:id/export',
  assetsApi: 'GET /api/themes/:id/assets/*',
  assetsPublic: 'GET /theme-assets/:theme/*',
} as const;
