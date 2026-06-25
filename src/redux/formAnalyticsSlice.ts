import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
import type { AnalyticsSummary } from '@/types/form-builder';

type MetricKey = 'views' | 'starts' | 'completions' | 'conversionRate';

export interface FormAnalyticsState {
  analytics: AnalyticsSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: FormAnalyticsState = {
  analytics: null,
  loading: false,
  error: null,
};

const formAnalyticsSlice = createSlice({
  name: 'formAnalytics',
  initialState,
  reducers: {
    setAnalytics(state, action: PayloadAction<AnalyticsSummary>) {
      state.analytics = action.payload;
      state.loading = false;
      state.error = null;
    },
    updateMetric(state, action: PayloadAction<{ key: MetricKey; value: number }>) {
      if (!state.analytics) return;
      state.analytics[action.payload.key] = action.payload.value;
    },
    setAnalyticsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setAnalyticsError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    resetAnalytics() {
      return initialState;
    },
  },
});

export const {
  setAnalytics,
  updateMetric,
  setAnalyticsLoading,
  setAnalyticsError,
  resetAnalytics,
} = formAnalyticsSlice.actions;

export default formAnalyticsSlice.reducer;

export const selectFormAnalytics = (s: RootState) => s.formAnalytics;
