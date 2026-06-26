import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_THEME_CONFIG } from '@/lib/theme/cssVars.site';
import type {
  ThemeConfig,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeRadius,
  ThemeShadows,
  ThemeLayout,
} from '@/types/theme';
import type { ComponentVariants, VariantFamily } from '@/types/component-variants';

/**
 * Working state for the Theme Builder. Holds the in-progress draft config that
 * the builder tabs mutate and the live preview reads. Persistence to the server
 * is done by the editor page (fetch → dispatch), not by thunks here.
 */
export interface ThemeBuilderState {
  themeId: string | null;
  name: string;
  draft: ThemeConfig;
  componentVariants: ComponentVariants;
  isSystemTheme: boolean;
  dirty: boolean;
}

const initialState: ThemeBuilderState = {
  themeId: null,
  name: '',
  draft: DEFAULT_THEME_CONFIG,
  componentVariants: {},
  isSystemTheme: false,
  dirty: false,
};

const themeBuilderSlice = createSlice({
  name: 'themeBuilder',
  initialState,
  reducers: {
    /** Load a theme into the builder (e.g. after fetching it for editing). */
    loadTheme(
      state,
      action: PayloadAction<{
        themeId: string | null;
        name: string;
        draft: ThemeConfig;
        componentVariants: ComponentVariants;
        isSystemTheme?: boolean;
      }>
    ) {
      state.themeId = action.payload.themeId;
      state.name = action.payload.name;
      state.draft = action.payload.draft;
      state.componentVariants = action.payload.componentVariants || {};
      state.isSystemTheme = !!action.payload.isSystemTheme;
      state.dirty = false;
    },
    setName(state, action: PayloadAction<string>) {
      state.name = action.payload;
      state.dirty = true;
    },
    setDraft(state, action: PayloadAction<ThemeConfig>) {
      state.draft = action.payload;
      state.dirty = true;
    },
    updateColor(
      state,
      action: PayloadAction<{ key: keyof ThemeColors; value: string }>
    ) {
      state.draft.colors[action.payload.key] = action.payload.value;
      state.dirty = true;
    },
    updateTypography(
      state,
      action: PayloadAction<{ key: keyof ThemeTypography; value: string }>
    ) {
      state.draft.typography[action.payload.key] = action.payload.value;
      state.dirty = true;
    },
    updateSpacing(
      state,
      action: PayloadAction<{ key: keyof ThemeSpacing; value: string }>
    ) {
      state.draft.spacing[action.payload.key] = action.payload.value;
      state.dirty = true;
    },
    updateRadius(
      state,
      action: PayloadAction<{ key: keyof ThemeRadius; value: string }>
    ) {
      state.draft.radius[action.payload.key] = action.payload.value;
      state.dirty = true;
    },
    updateShadow(
      state,
      action: PayloadAction<{ key: keyof ThemeShadows; value: string }>
    ) {
      state.draft.shadows[action.payload.key] = action.payload.value;
      state.dirty = true;
    },
    updateLayout(
      state,
      action: PayloadAction<{ key: keyof ThemeLayout; value: string }>
    ) {
      state.draft.layout[action.payload.key] = action.payload.value;
      state.dirty = true;
    },
    setVariant(
      state,
      action: PayloadAction<{ family: VariantFamily; variantId: string }>
    ) {
      state.componentVariants[action.payload.family] = action.payload.variantId;
      state.dirty = true;
    },
    markSaved(state) {
      state.dirty = false;
    },
    resetDraft() {
      return initialState;
    },
  },
});

export const {
  loadTheme,
  setName,
  setDraft,
  updateColor,
  updateTypography,
  updateSpacing,
  updateRadius,
  updateShadow,
  updateLayout,
  setVariant,
  markSaved,
  resetDraft,
} = themeBuilderSlice.actions;

export default themeBuilderSlice.reducer;
