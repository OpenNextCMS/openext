export { defineTheme, definePlugin } from './defineTheme';
export { ThemeRegistrationContext } from './ThemeRegistrationContext';
export { createEmptyRegistry } from './createEmptyRegistry';
export { autoDiscover } from './autoDiscover';
export { manifestFromRegistry, mergeRegistries, registryToManifestPaths } from './manifestFromRegistry';
export { validateRegistration, RegistrationValidationCode } from './validateRegistration';
export { ThemeBootstrap, themeBootstrap, bootstrapInstalledTheme } from './ThemeBootstrap';
export type {
  ThemeDefinition,
  ThemeRegistrationContext as IThemeRegistrationContext,
  ThemeRuntimeRegistry,
  ThemeHookContext,
  ThemeHookName,
  RegistryManifestPaths,
} from './types';
