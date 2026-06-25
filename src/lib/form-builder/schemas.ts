import { z } from 'zod';
import { FormFieldType, FormStatus } from '@/types/form-builder';
import type { ConditionalGroup } from '@/types/form-builder';

/** Zod request schemas for the Form Builder API routes. */

const widthSchema = z.enum(['25%', '50%', '75%', '100%']);

export const fieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const fieldValidationSchema = z
  .object({
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().nonnegative().optional(),
    regex: z.string().optional(),
    pattern: z.string().optional(),
    custom: z.string().optional(),
  })
  .partial();

export const conditionalConditionSchema = z.object({
  fieldId: z.string(),
  operator: z.enum([
    'equals',
    'notEquals',
    'contains',
    'greaterThan',
    'lessThan',
    'isEmpty',
    'isNotEmpty',
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

// Recursive group: a set of conditions + optional nested sub-groups (AND/OR).
export const conditionalGroupSchema: z.ZodType<ConditionalGroup> = z.lazy(() =>
  z.object({
    join: z.enum(['AND', 'OR']),
    conditions: z.array(conditionalConditionSchema),
    groups: z.array(conditionalGroupSchema).optional(),
  })
);

export const conditionalRuleSchema = z.object({
  id: z.string(),
  action: z.enum(['show', 'hide', 'makeRequired']),
  targetFieldId: z.string().optional(),
  group: conditionalGroupSchema,
});

export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: z.nativeEnum(FormFieldType),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  validation: fieldValidationSchema.optional(),
  width: widthSchema.optional(),
  order: z.number().int().default(0),
  conditionalRules: z.array(conditionalRuleSchema).optional(),
  options: z.array(fieldOptionSchema).optional(),
  step: z.number().int().positive().optional(),
  cssClass: z.string().optional(),
});

// Settings is deep + mostly optional; accept a partial object permissively and
// let DEFAULT_FORM_SETTINGS fill the gaps at the service layer.
export const formSettingsSchema = z.record(z.string(), z.unknown());

export const createFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(FormStatus).optional(),
  fields: z.array(formFieldSchema).optional(),
  settings: formSettingsSchema.optional(),
});

export const updateFormSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    status: z.nativeEnum(FormStatus).optional(),
    fields: z.array(formFieldSchema).optional(),
    settings: formSettingsSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const restoreVersionSchema = z.object({
  versionId: z.string().min(1),
});

export const trackEventSchema = z.object({
  event: z.enum(['view', 'start']),
  sourcePage: z.string().optional(),
});

export const aiGenerateSchema = z.object({
  prompt: z.string().min(3, 'Describe the form you want'),
});

export const aiValidationSchema = z.object({
  prompt: z.string().min(3),
  fieldType: z.string().min(1),
});

export const aiOptimizeSchema = z.object({
  formId: z.string().min(1),
});
