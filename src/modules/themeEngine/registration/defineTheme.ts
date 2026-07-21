import { ThemeRegistrationContext } from './ThemeRegistrationContext';
import type { ThemeDefinition, ThemeRegistrationCallback } from './types';

/**
 * Bootstrap entry for theme authors — mirrors WordPress `functions.php`.
 * Executes the registration callback immediately and returns a frozen definition.
 */
export function defineTheme(setup: ThemeRegistrationCallback): ThemeDefinition {
  const ctx = new ThemeRegistrationContext();
  setup(ctx);
  return ctx.toDefinition();
}

/** Plugins share the same registration surface. */
export function definePlugin(setup: ThemeRegistrationCallback): ThemeDefinition {
  return defineTheme(setup);
}
