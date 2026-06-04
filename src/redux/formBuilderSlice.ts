import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState } from './store';
import type { IForm, IFormField } from '@/types/form-builder';

/**
 * Form Builder editor state. Fields are stored *normalized* by id with a
 * separate order array, so reorder/update/duplicate are O(1)-ish and the
 * dnd-kit SortableContext can drive `fieldOrder` directly.
 */

export type FormMeta = Omit<IForm, 'fields'>;

export interface FormBuilderState {
  form: FormMeta | null;
  fieldsById: Record<string, IFormField>;
  fieldOrder: string[];
  selectedFieldId: string | null;
  isDragging: boolean;
  isSaving: boolean;
  activeStep: number;
  dirty: boolean;
  lastSavedAt: string | null;
}

const initialState: FormBuilderState = {
  form: null,
  fieldsById: {},
  fieldOrder: [],
  selectedFieldId: null,
  isDragging: false,
  isSaving: false,
  activeStep: 1,
  dirty: false,
  lastSavedAt: null,
};

function reindex(state: FormBuilderState): void {
  state.fieldOrder.forEach((id, i) => {
    const f = state.fieldsById[id];
    if (f) f.order = i;
  });
}

const formBuilderSlice = createSlice({
  name: 'formBuilder',
  initialState,
  reducers: {
    setForm(state, action: PayloadAction<IForm>) {
      const { fields, ...meta } = action.payload;
      state.form = meta as FormMeta;
      state.fieldsById = {};
      state.fieldOrder = [];
      const sorted = [...(fields ?? [])].sort((a, b) => a.order - b.order);
      for (const f of sorted) {
        state.fieldsById[f.id] = f;
        state.fieldOrder.push(f.id);
      }
      state.selectedFieldId = null;
      state.activeStep = 1;
      state.dirty = false;
    },

    updateMeta(state, action: PayloadAction<Partial<FormMeta>>) {
      if (!state.form) return;
      state.form = { ...state.form, ...action.payload };
      state.dirty = true;
    },

    addField(state, action: PayloadAction<{ field: IFormField; index?: number }>) {
      const { field, index } = action.payload;
      const f = { ...field, id: field.id || uuidv4() };
      state.fieldsById[f.id] = f;
      if (index == null || index >= state.fieldOrder.length) {
        state.fieldOrder.push(f.id);
      } else {
        state.fieldOrder.splice(Math.max(0, index), 0, f.id);
      }
      reindex(state);
      state.selectedFieldId = f.id;
      state.dirty = true;
    },

    removeField(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.fieldsById[id];
      state.fieldOrder = state.fieldOrder.filter((x) => x !== id);
      if (state.selectedFieldId === id) state.selectedFieldId = null;
      reindex(state);
      state.dirty = true;
    },

    duplicateField(state, action: PayloadAction<string>) {
      const id = action.payload;
      const src = state.fieldsById[id];
      if (!src) return;
      const newId = uuidv4();
      const copy: IFormField = { ...src, id: newId, label: `${src.label} (copy)` };
      state.fieldsById[newId] = copy;
      const idx = state.fieldOrder.indexOf(id);
      state.fieldOrder.splice(idx + 1, 0, newId);
      reindex(state);
      state.selectedFieldId = newId;
      state.dirty = true;
    },

    reorderFields(state, action: PayloadAction<string[]>) {
      // Accept a fully-ordered id list (dnd-kit arrayMove result).
      const next = action.payload.filter((id) => state.fieldsById[id]);
      if (next.length === state.fieldOrder.length) {
        state.fieldOrder = next;
        reindex(state);
        state.dirty = true;
      }
    },

    updateField(state, action: PayloadAction<{ id: string; patch: Partial<IFormField> }>) {
      const { id, patch } = action.payload;
      const f = state.fieldsById[id];
      if (!f) return;
      state.fieldsById[id] = { ...f, ...patch, id };
      state.dirty = true;
    },

    setSelectedField(state, action: PayloadAction<string | null>) {
      state.selectedFieldId = action.payload;
    },

    setActiveStep(state, action: PayloadAction<number>) {
      state.activeStep = Math.max(1, action.payload);
    },

    setDragging(state, action: PayloadAction<boolean>) {
      state.isDragging = action.payload;
    },

    setSaving(state, action: PayloadAction<boolean>) {
      state.isSaving = action.payload;
    },

    markSaved(state) {
      state.dirty = false;
      state.isSaving = false;
      state.lastSavedAt = new Date().toISOString();
    },

    resetBuilder() {
      return initialState;
    },
  },
});

export const {
  setForm,
  updateMeta,
  addField,
  removeField,
  duplicateField,
  reorderFields,
  updateField,
  setSelectedField,
  setActiveStep,
  setDragging,
  setSaving,
  markSaved,
  resetBuilder,
} = formBuilderSlice.actions;

export default formBuilderSlice.reducer;

/* ----------------------------- selectors -------------------------------- */

const EMPTY_FIELDS: IFormField[] = [];

export const selectBuilder = (s: RootState) => s.formBuilder;

export const selectOrderedFields = (s: RootState): IFormField[] => {
  const fb = s.formBuilder;
  if (!fb.fieldOrder.length) return EMPTY_FIELDS;
  return fb.fieldOrder.map((id) => fb.fieldsById[id]).filter(Boolean);
};

export const selectSelectedField = (s: RootState): IFormField | null => {
  const { selectedFieldId, fieldsById } = s.formBuilder;
  return selectedFieldId ? fieldsById[selectedFieldId] ?? null : null;
};

/** Reconstruct the full IForm (meta + ordered fields) for save/preview. */
export function selectComposedForm(s: RootState): IForm | null {
  const fb = s.formBuilder;
  if (!fb.form) return null;
  return { ...fb.form, fields: fb.fieldOrder.map((id) => fb.fieldsById[id]).filter(Boolean) };
}
