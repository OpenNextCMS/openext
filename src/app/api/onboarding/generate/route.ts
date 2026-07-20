import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/auth';
import { generateStarterWebsite } from '@/services/generateStarterWebsite';

const generateSchema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required'),
  businessCategory: z.string().trim().min(1, 'Business category is required'),
  businessDescription: z.string().trim().min(1, 'Business description is required'),
  location: z.string().trim().optional().default(''),
  websiteType: z.string().trim().min(1, 'Website type is required'),
  headerTemplate: z.string().trim().min(1, 'Header is required'),
  footerTemplate: z.string().trim().min(1, 'Footer is required'),
  theme: z.string().trim().min(1, 'Theme is required'),
});

/**
 * POST /api/onboarding/generate — generate the starter website for the current
 * user from the wizard payload. Idempotent (see generateStarterWebsite).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const data = generateSchema.parse(await req.json());
    const result = await generateStarterWebsite({ userId: auth.userId, ...data });
    return apiOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
