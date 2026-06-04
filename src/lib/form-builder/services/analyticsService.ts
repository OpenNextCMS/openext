import { getPageDbConnection, getFormModel, getFormSubmissionModel } from '@/utils/db';
import type { AnalyticsSummary, IForm } from '@/types/form-builder';

/**
 * AnalyticsService — view / start / completion tracking for forms.
 *
 * Counters live on the Form document's embedded `analytics` object (cheap
 * increments, like the blog system's `Page.views`). The per-day timeline is
 * also maintained on the form. `getAnalytics` derives the AnalyticsSummary and
 * blends in real submission counts for the requested date range.
 */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function bumpTimeline(
  tenantId: string,
  formId: string,
  metric: 'views' | 'starts' | 'completions'
): Promise<void> {
  const pageDb = await getPageDbConnection();
  const Form = getFormModel(pageDb);
  const date = todayKey();

  // Increment the top-level counter.
  await Form.updateOne({ _id: formId, tenantId }, { $inc: { [`analytics.${metric}`]: 1 } });

  // Upsert today's timeline point.
  const matched = await Form.updateOne(
    { _id: formId, tenantId, 'analytics.timeline.date': date },
    { $inc: { [`analytics.timeline.$.${metric}`]: 1 } }
  );
  if (matched.matchedCount === 0) {
    const point = { date, views: 0, starts: 0, completions: 0, [metric]: 1 };
    await Form.updateOne(
      { _id: formId, tenantId },
      { $push: { 'analytics.timeline': point } }
    );
  }

  await recomputeConversion(tenantId, formId);
}

async function recomputeConversion(tenantId: string, formId: string): Promise<void> {
  const pageDb = await getPageDbConnection();
  const Form = getFormModel(pageDb);
  const doc = await Form.findOne({ _id: formId, tenantId })
    .select('analytics.views analytics.completions')
    .lean()
    .exec();
  const a = (doc as { analytics?: { views?: number; completions?: number } } | null)?.analytics;
  const views = a?.views ?? 0;
  const completions = a?.completions ?? 0;
  const rate = views > 0 ? Math.round((completions / views) * 1000) / 10 : 0;
  await Form.updateOne({ _id: formId, tenantId }, { $set: { 'analytics.conversionRate': rate } });
}

export const AnalyticsService = {
  async trackView(tenantId: string, formId: string, sourcePage?: string): Promise<void> {
    try {
      // sourcePage is accepted for future per-source breakdowns; the aggregate
      // view counter is incremented regardless of origin.
      if (sourcePage) {
        /* reserved: per-source view attribution */
      }
      await bumpTimeline(tenantId, formId, 'views');
    } catch (err) {
      console.error('[form-builder] trackView failed:', err);
    }
  },

  async trackStart(tenantId: string, formId: string): Promise<void> {
    try {
      await bumpTimeline(tenantId, formId, 'starts');
    } catch (err) {
      console.error('[form-builder] trackStart failed:', err);
    }
  },

  async trackCompletion(tenantId: string, formId: string): Promise<void> {
    try {
      await bumpTimeline(tenantId, formId, 'completions');
    } catch (err) {
      console.error('[form-builder] trackCompletion failed:', err);
    }
  },

  async getAnalytics(
    tenantId: string,
    formId: string,
    dateRange: { startDate?: string; endDate?: string }
  ): Promise<AnalyticsSummary> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);
    const Submission = getFormSubmissionModel(pageDb);

    const formDoc = await Form.findOne({ _id: formId, tenantId }).lean().exec();
    const form = formDoc as unknown as IForm | null;

    const startDate = dateRange.startDate ?? '1970-01-01';
    const endDate = dateRange.endDate ?? todayKey();

    const analytics = form?.analytics;
    const timeline = (analytics?.timeline ?? []).filter(
      (p) => p.date >= startDate && p.date <= endDate
    );

    // Real completion count from submissions in range (source of truth).
    const completions = await Submission.countDocuments({
      tenantId,
      formId,
      createdAt: { $gte: new Date(startDate), $lte: new Date(`${endDate}T23:59:59.999Z`) },
    });

    const views = analytics?.views ?? 0;
    const starts = analytics?.starts ?? 0;
    const conversionRate = views > 0 ? Math.round((completions / views) * 1000) / 10 : 0;

    // Map drop-off counts onto field labels for display.
    const dropOff = analytics?.dropOffByField ?? {};
    const fieldLabel = new Map((form?.fields ?? []).map((f) => [f.id, f.label]));
    const dropOffByField = Object.entries(dropOff).map(([fieldId, count]) => ({
      fieldId,
      label: fieldLabel.get(fieldId) ?? fieldId,
      count: Number(count) || 0,
    }));

    return {
      formId,
      range: { startDate, endDate },
      views,
      starts,
      completions,
      conversionRate,
      dropOffByField,
      timeline,
    };
  },
};

export type AnalyticsServiceType = typeof AnalyticsService;
