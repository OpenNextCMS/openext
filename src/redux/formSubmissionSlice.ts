import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
import type { ISubmission } from '@/types/form-builder';

export interface FormSubmissionState {
  submissions: ISubmission[];
  currentSubmission: ISubmission | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
}

const initialState: FormSubmissionState = {
  submissions: [],
  currentSubmission: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
};

const formSubmissionSlice = createSlice({
  name: 'formSubmissions',
  initialState,
  reducers: {
    setSubmissions(
      state,
      action: PayloadAction<{ submissions: ISubmission[]; total: number; page: number }>
    ) {
      state.submissions = action.payload.submissions;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.loading = false;
      state.error = null;
    },
    appendSubmission(state, action: PayloadAction<ISubmission>) {
      state.submissions.push(action.payload);
      state.total += 1;
    },
    setCurrentSubmission(state, action: PayloadAction<ISubmission | null>) {
      state.currentSubmission = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    resetSubmissions() {
      return initialState;
    },
  },
});

export const {
  setSubmissions,
  appendSubmission,
  setCurrentSubmission,
  setLoading,
  setError,
  resetSubmissions,
} = formSubmissionSlice.actions;

export default formSubmissionSlice.reducer;

export const selectSubmissions = (s: RootState) => s.formSubmissions;
