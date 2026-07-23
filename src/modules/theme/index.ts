/**
 * Theme Package Manager — public module barrel.
 *
 * Layered architecture:
 *   routes → controllers → services → repositories / utils / validators
 */

export * from './constants';
export * from './types';

export { ThemeInstallController } from './controllers/ThemeInstallController';
export { ThemeActivationController } from './controllers/ThemeActivationController';
export { ThemeExportController } from './controllers/ThemeExportController';
export { ThemeCrudController } from './controllers/ThemeCrudController';
export { ThemeAssetController } from './controllers/ThemeAssetController';

export { ThemeInstaller } from './services/ThemeInstaller';
export { ThemeExporter } from './services/ThemeExporter';
export { ThemeActivationService } from './services/ThemeActivationService';
export { ThemeLayoutApplyService } from './services/ThemeLayoutApplyService';
export { ThemeRegistry } from './services/ThemeRegistry';
export { ThemeLoader } from './services/ThemeLoader';
export { ThemeAssetService } from './services/ThemeAssetService';
export { ThemeValidationService } from './services/ThemeValidationService';

export { ThemeRepository } from './repositories/ThemeRepository';
export {
  buildPageBlocksFromTheme,
  getThemeLayoutSections,
  DEFAULT_THEME_LAYOUT_SECTIONS,
} from './utils/ThemeLayoutBuilder';
