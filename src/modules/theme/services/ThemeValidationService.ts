import { validateThemeJson } from '../validators/ThemeJsonValidator';
import {
  assertHasDesignTokens,
  assertPackageStructure,
  validateCmsCompatibility,
  validateZipUpload,
} from '../validators/PackageValidator';
import {
  mergeAndValidateTokens,
  validateComponentVariants,
  validateTokenGroup,
} from '../validators/TokenValidator';

/**
 * ThemeValidationService — facade over package / theme.json / token validators.
 */
export const ThemeValidationService = {
  validateZipUpload,
  validateThemeJson,
  validateCmsCompatibility,
  assertPackageStructure,
  assertHasDesignTokens,
  validateTokenGroup,
  mergeAndValidateTokens,
  validateComponentVariants,
};
