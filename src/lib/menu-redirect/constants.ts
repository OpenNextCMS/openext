// Plugin identity. We standardize on this pluginId in the existing `Plugin`
// collection; the lifecycle gate also tolerates the marketplace-install
// variants (e.g. "market-8", type "menu") so an install via the existing
// marketplace UI still activates the plugin.
export const MENU_REDIRECT_PLUGIN_KEY = 'menu-redirect';
export const MENU_REDIRECT_PLUGIN_ID = 'menu-redirect';
export const MENU_REDIRECT_VERSION = '1.0.0';

export const MENU_REDIRECT_PLUGIN_DEFAULTS = {
  name: 'Menu Redirect',
  description: 'Map header menu items to pages, posts, anchors or external URLs with click tracking.',
  author: 'OpenNext',
  type: 'menu',
  icon: 'Menu',
};

export const DEFAULT_PLUGIN_SETTINGS: Record<string, unknown> = {
  defaultTrackClicks: false,
};
