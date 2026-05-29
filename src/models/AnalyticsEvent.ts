import { Schema, model, models } from 'mongoose';
import type { IAnalyticsEventDocument } from '@/types/index';

// Lightweight analytics events for blog posts (consumed in Phase 9).
// - "view": a post page load
// - "read": fired on unmount/visibility-change with durationSec
// - "search": a search-bar submission (query stored, blogId omitted)
// Only createdAt is tracked (no updates). No TTL — events are retained.
const AnalyticsEventSchema = new Schema<IAnalyticsEventDocument>(
  {
    blogId: { type: Schema.Types.ObjectId, ref: 'Page' },
    type: { type: String, enum: ['view', 'read', 'search'], required: true },
    visitorId: { type: String },
    durationSec: { type: Number },
    query: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AnalyticsEventSchema.index({ blogId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ type: 1, createdAt: -1 });

const AnalyticsEventModel =
  models.AnalyticsEvent || model<IAnalyticsEventDocument>('AnalyticsEvent', AnalyticsEventSchema);

export default AnalyticsEventModel;
export { AnalyticsEventSchema };
