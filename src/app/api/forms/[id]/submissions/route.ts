import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { parsePagination } from '@/lib/api/pagination';
import { guardFormBuilder } from '@/lib/form-builder/guard';
import { SubmissionService } from '@/lib/form-builder/services/submissionService';

/** GET /api/forms/[id]/submissions — paginated submissions (forms.submissions.view). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await guardFormBuilder('forms.submissions.view');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePagination(searchParams);

    const { submissions, total } = await SubmissionService.getSubmissions(tenantId, id, {
      page,
      limit,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    return apiOk(submissions, {
      meta: { total, page, limit, hasMore: page * limit < total },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
