import { v4 as uuidv4 } from 'uuid';
import { callAI, safeParseJson } from '@/lib/ai/provider';
import { ApiError } from '@/lib/api/errors';
import type {
  IForm,
  IFormField,
  FormFieldTypeValue,
  ValidationRule,
  FormOptimizationSuggestion,
} from '@/types/form-builder';
import { FormFieldType } from '@/types/form-builder';

/**
 * AI helpers for the Form Builder, routed through the repo's existing
 * OpenRouter integration (`callAI`), exactly like the blog AI endpoints. The
 * Python sidecar is not invoked directly by the Next app, so we reuse `callAI`.
 */

const FIELD_TYPES = Object.values(FormFieldType).join(', ');

const SCHEMA_SYSTEM = `You are a form-design assistant. Output ONLY JSON (no markdown fences).
Return an array of form fields. Each field has the shape:
{
  "type": one of [${FIELD_TYPES}],
  "label": string,
  "placeholder": string (optional),
  "helpText": string (optional),
  "required": boolean,
  "width": one of ["25%","50%","75%","100%"],
  "options": [{"label": string, "value": string}] (only for dropdown/radio/checkbox),
  "validation": {"minLength"?: number, "maxLength"?: number, "pattern"?: "email"|"phone"|"url"|"alphanumeric"|"numeric"}
}
Use section_header and divider for structure. Keep it concise and practical.`;

interface RawField {
  type?: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  width?: string;
  options?: Array<{ label?: string; value?: string }>;
  validation?: Record<string, unknown>;
  step?: number;
}

const VALID_TYPES = new Set<string>(Object.values(FormFieldType));
const VALID_WIDTHS = new Set(['25%', '50%', '75%', '100%']);

function normalizeField(raw: RawField, index: number): IFormField | null {
  const type = (raw.type ?? '').trim() as FormFieldTypeValue;
  if (!VALID_TYPES.has(type)) return null;
  const width = VALID_WIDTHS.has(raw.width ?? '') ? (raw.width as IFormField['width']) : '100%';
  const options =
    Array.isArray(raw.options) && raw.options.length
      ? raw.options
          .filter((o) => o && (o.label || o.value))
          .map((o) => ({ label: String(o.label ?? o.value), value: String(o.value ?? o.label) }))
      : undefined;
  return {
    id: uuidv4(),
    type,
    label: String(raw.label ?? 'Untitled'),
    placeholder: raw.placeholder ? String(raw.placeholder) : undefined,
    helpText: raw.helpText ? String(raw.helpText) : undefined,
    required: !!raw.required,
    width,
    order: index,
    options,
    step: typeof raw.step === 'number' ? raw.step : 1,
    validation: (raw.validation as IFormField['validation']) ?? {},
  };
}

export async function generateFormSchema(prompt: string): Promise<IFormField[]> {
  const raw = await callAI(
    [
      { role: 'system', content: SCHEMA_SYSTEM },
      { role: 'user', content: `Build a form for: ${prompt}` },
    ],
    { temperature: 0.6, maxTokens: 2000 }
  );

  const parsed = safeParseJson<RawField[] | { fields?: RawField[] }>(raw);
  const list: RawField[] = Array.isArray(parsed) ? parsed : (parsed?.fields ?? []);
  if (!Array.isArray(list) || list.length === 0) {
    throw new ApiError('AI returned an unexpected format.', 502);
  }
  const fields = list.map(normalizeField).filter((f): f is IFormField => f !== null);
  if (!fields.length) throw new ApiError('AI produced no valid fields.', 502);
  return fields;
}

export async function generateValidationRules(
  prompt: string,
  fieldType: string
): Promise<ValidationRule[]> {
  const raw = await callAI(
    [
      {
        role: 'system',
        content: `You generate validation rules for a "${fieldType}" form field. Output ONLY JSON: an array of
{ "type": "minLength"|"maxLength"|"regex"|"pattern"|"email"|"phone"|"url"|"custom", "value"?: string|number, "message"?: string }.
For regex rules put the raw pattern (no slashes) in "value". Example: "Indian mobile numbers" -> [{"type":"regex","value":"^[6-9]\\\\d{9}$","message":"Enter a valid 10-digit mobile number"}].`,
      },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.3, maxTokens: 600 }
  );

  const parsed = safeParseJson<ValidationRule[] | { rules?: ValidationRule[] }>(raw);
  const list = Array.isArray(parsed) ? parsed : (parsed?.rules ?? []);
  if (!Array.isArray(list)) throw new ApiError('AI returned an unexpected format.', 502);
  const allowed = new Set(['minLength', 'maxLength', 'regex', 'pattern', 'email', 'phone', 'url', 'custom']);
  return list
    .filter((r) => r && typeof r.type === 'string' && allowed.has(r.type))
    .map((r) => ({ type: r.type, value: r.value, message: r.message }));
}

export async function analyzeForm(form: IForm): Promise<FormOptimizationSuggestion[]> {
  const summary = {
    name: form.name,
    fieldCount: form.fields.length,
    fields: form.fields.map((f) => ({
      label: f.label,
      type: f.type,
      required: !!f.required,
    })),
    multiStep: form.settings.multiStep.enabled,
  };

  const raw = await callAI(
    [
      {
        role: 'system',
        content: `You are a conversion-rate optimization expert for web forms. Output ONLY JSON: an array of
{ "type": string, "field"?: string, "suggestion": string, "priority": "low"|"high"|"medium" }.
Focus on field count, required fields, ordering, labels, and multi-step opportunities.`,
      },
      { role: 'user', content: `Analyze this form and suggest improvements:\n${JSON.stringify(summary)}` },
    ],
    { temperature: 0.5, maxTokens: 1200 }
  );

  const parsed = safeParseJson<FormOptimizationSuggestion[] | { suggestions?: FormOptimizationSuggestion[] }>(raw);
  const list = Array.isArray(parsed) ? parsed : (parsed?.suggestions ?? []);
  if (!Array.isArray(list)) return [];
  const priorities = new Set(['low', 'medium', 'high']);
  return list
    .filter((s) => s && typeof s.suggestion === 'string')
    .map((s) => ({
      type: String(s.type ?? 'general'),
      field: s.field ? String(s.field) : undefined,
      suggestion: String(s.suggestion),
      priority: priorities.has(s.priority) ? s.priority : 'medium',
    }));
}
