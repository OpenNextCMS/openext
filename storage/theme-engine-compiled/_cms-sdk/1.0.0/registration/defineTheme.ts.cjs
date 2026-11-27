"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineTheme = defineTheme;
exports.definePlugin = definePlugin;
const ThemeRegistrationContext_1 = require("D:/Professional/ATPL/nextcmsmains/storage/theme-engine-compiled/_cms-sdk/1.0.0/registration/ThemeRegistrationContext.ts.cjs");
/**
 * Bootstrap entry for theme authors — mirrors WordPress `functions.php`.
 * Executes the registration callback immediately and returns a frozen definition.
 */
function defineTheme(setup) {
    const ctx = new ThemeRegistrationContext_1.ThemeRegistrationContext();
    setup(ctx);
    return ctx.toDefinition();
}
/** Plugins share the same registration surface. */
function definePlugin(setup) {
    return defineTheme(setup);
}
