export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapBackendPlugins } = await import('@/lib/plugins/server/bootstrap');
    await bootstrapBackendPlugins();

    const { themeManager } = await import('@/modules/themeEngine/ThemeManager');
    await themeManager.ensureDefaultThemeReady().catch((err) => {
      console.error('[themeEngine] Failed to seed default theme on startup:', err);
    });
  }
}
