import { z } from 'zod';

const responsiveSchema = z
  .object({
    desktop: z.record(z.unknown()).default({}),
    tablet: z.record(z.unknown()).default({}),
    mobile: z.record(z.unknown()).default({}),
  })
  .default({ desktop: {}, tablet: {}, mobile: {} });

export const layoutSectionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  visible: z.boolean().default(true),
  settings: z.record(z.unknown()).default({}),
  responsive: responsiveSchema,
});

export const createLayoutSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sections: z.array(layoutSectionSchema).default([]),
});

export const updateLayoutSchema = createLayoutSchema.partial();
