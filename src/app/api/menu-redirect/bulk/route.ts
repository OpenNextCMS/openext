import { NextRequest } from 'next/server';
import { getPageDbConnection, getMenuRedirectMappingModel } from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import { parseCreate } from '@/lib/menu-redirect/validation';
import { generateTargetUrl } from '@/lib/menu-redirect/url-generator';
import { logMenuRedirectHistory } from '@/lib/menu-redirect/history';

/**
 * POST /api/menu-redirect/bulk — validate-all → write-all → single history row.
 * Existing mappings are NOT overwritten unless a row sets overwrite:true.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await guardMenuRedirect('bulk');
    const body = (await req.json()) as {
      mappings?: Array<Record<string, unknown> & { overwrite?: boolean }>;
    };
    const rows = Array.isArray(body.mappings) ? body.mappings : [];

    // Validate everything first.
    const valid: { data: ReturnType<typeof parseCreate>['data']; overwrite?: boolean }[] = [];
    for (const row of rows) {
      const parsed = parseCreate(row);
      if (parsed.data) valid.push({ data: parsed.data, overwrite: !!row.overwrite });
    }

    const pageDb = await getPageDbConnection();
    const Mapping = getMenuRedirectMappingModel(pageDb);

    const headerIds = [...new Set(valid.map((v) => v.data!.headerId))];
    const existing = await Mapping.find({ headerId: { $in: headerIds } })
      .select('headerId menuItemId')
      .lean()
      .exec();
    const existingKeys = new Set(
      existing.map((e) => `${(e as { headerId: string }).headerId}::${(e as { menuItemId: string }).menuItemId}`)
    );

    let written = 0;
    let skipped = 0;
    for (const { data, overwrite } of valid) {
      if (!data) continue;
      const key = `${data.headerId}::${data.menuItemId}`;
      if (existingKeys.has(key) && !overwrite) {
        skipped += 1;
        continue;
      }
      await Mapping.findOneAndUpdate(
        { headerId: data.headerId, menuItemId: data.menuItemId },
        { $set: { ...data, targetUrl: generateTargetUrl(data) } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      written += 1;
    }

    await logMenuRedirectHistory({
      action: 'bulk-auto-match',
      newValue: { written, skipped, attempted: rows.length },
      userId,
    });

    return apiOk({ written, skipped, attempted: rows.length });
  } catch (err) {
    return handleApiError(err);
  }
}
