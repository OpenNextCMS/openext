import { z } from 'zod';

// Per-targetType validation via a discriminated union:
//  - page/blog/blog-category/cms require targetId
//  - anchor requires a targetUrl starting with '#'
//  - external requires a valid URL

const baseShape = {
  headerId: z.string().min(1, 'headerId is required'),
  menuItemId: z.string().min(1, 'menuItemId is required'),
  openInNewTab: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  enabled: z.boolean().optional(),
  customClass: z.string().optional(),
  dataAttributes: z.record(z.string()).optional(),
  dynamicParams: z.record(z.string()).optional(),
};

const idTarget = (t: 'page' | 'blog' | 'blog-category' | 'cms') =>
  z.object({
    ...baseShape,
    targetType: z.literal(t),
    targetId: z.string().min(1, `${t} target requires targetId`),
    targetSlug: z.string().optional(),
    targetUrl: z.string().optional(),
  });

const anchorTarget = z.object({
  ...baseShape,
  targetType: z.literal('anchor'),
  targetId: z.string().optional(),
  targetSlug: z.string().optional(),
  targetUrl: z.string().regex(/^#/, 'Anchor target must start with #'),
});

const externalTarget = z.object({
  ...baseShape,
  targetType: z.literal('external'),
  targetId: z.string().optional(),
  targetSlug: z.string().optional(),
  targetUrl: z.string().url('External target must be a valid URL'),
});

export const createMappingSchema = z.discriminatedUnion('targetType', [
  idTarget('page'),
  idTarget('blog'),
  idTarget('blog-category'),
  idTarget('cms'),
  anchorTarget,
  externalTarget,
]);

// Updates: every field optional, with conditional checks when targetType is present.
export const updateMappingSchema = z
  .object({
    targetType: z.enum(['page', 'blog', 'blog-category', 'anchor', 'external', 'cms']).optional(),
    targetId: z.string().optional(),
    targetSlug: z.string().optional(),
    targetUrl: z.string().optional(),
    openInNewTab: z.boolean().optional(),
    nofollow: z.boolean().optional(),
    trackClicks: z.boolean().optional(),
    enabled: z.boolean().optional(),
    customClass: z.string().optional(),
    dataAttributes: z.record(z.string()).optional(),
    dynamicParams: z.record(z.string()).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.targetType) return;
    if (['page', 'blog', 'blog-category', 'cms'].includes(val.targetType) && !val.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetId'],
        message: `${val.targetType} target requires targetId`,
      });
    }
    if (val.targetType === 'anchor' && (!val.targetUrl || !val.targetUrl.startsWith('#'))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetUrl'],
        message: 'Anchor target must start with #',
      });
    }
    if (val.targetType === 'external') {
      const ok = !!val.targetUrl && /^https?:\/\//i.test(val.targetUrl);
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targetUrl'],
          message: 'External target must be a valid URL',
        });
      }
    }
  });

export type CreateMappingInput = z.infer<typeof createMappingSchema>;
export type UpdateMappingInput = z.infer<typeof updateMappingSchema>;

type ParseResult<T> = { data: T; error?: undefined } | { data?: undefined; error: z.ZodError };

export function parseCreate(input: unknown): ParseResult<CreateMappingInput> {
  const r = createMappingSchema.safeParse(input);
  return r.success ? { data: r.data } : { error: r.error };
}

export function parseUpdate(input: unknown): ParseResult<UpdateMappingInput> {
  const r = updateMappingSchema.safeParse(input);
  return r.success ? { data: r.data } : { error: r.error };
}
