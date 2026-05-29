import { Schema, model, models } from 'mongoose';
import type { MenuRedirectAnalyticsDocument } from '@/types/menu-redirect';

// One analytics counter per mapping (page DB).
const MenuRedirectAnalyticsSchema = new Schema<MenuRedirectAnalyticsDocument>(
  {
    mappingId: { type: Schema.Types.ObjectId, ref: 'MenuRedirectMapping', required: true },
    menuItemId: { type: String, required: true },
    targetId: { type: String },
    clicks: { type: Number, default: 0 },
    lastClickedAt: { type: Date },
  },
  { timestamps: true }
);

MenuRedirectAnalyticsSchema.index({ mappingId: 1 }, { unique: true });

const MenuRedirectAnalyticsModel =
  models.MenuRedirectAnalytics ||
  model<MenuRedirectAnalyticsDocument>('MenuRedirectAnalytics', MenuRedirectAnalyticsSchema);

export default MenuRedirectAnalyticsModel;
export { MenuRedirectAnalyticsSchema };
