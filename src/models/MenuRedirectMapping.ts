import { Schema, model, models } from 'mongoose';
import type { MenuRedirectMappingDocument } from '@/types/menu-redirect';

// Header menu-item → redirect-target mapping. Lives in the per-tenant page DB
// (alongside Pages/headers). No workspaceId/websiteId — tenancy is by database.
const MenuRedirectMappingSchema = new Schema<MenuRedirectMappingDocument>(
  {
    headerId: { type: String, required: true },
    menuItemId: { type: String, required: true },
    targetType: {
      type: String,
      enum: ['page', 'blog', 'blog-category', 'anchor', 'external', 'cms'],
      required: true,
    },
    targetId: { type: String },
    targetSlug: { type: String },
    targetUrl: { type: String },
    openInNewTab: { type: Boolean, default: false },
    nofollow: { type: Boolean, default: false },
    trackClicks: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    customClass: { type: String },
    dataAttributes: { type: Schema.Types.Mixed },
    dynamicParams: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// One mapping per menu item within a header; fast lookup of a header's mappings.
MenuRedirectMappingSchema.index({ headerId: 1, menuItemId: 1 }, { unique: true });
MenuRedirectMappingSchema.index({ headerId: 1 });

const MenuRedirectMappingModel =
  models.MenuRedirectMapping ||
  model<MenuRedirectMappingDocument>('MenuRedirectMapping', MenuRedirectMappingSchema);

export default MenuRedirectMappingModel;
export { MenuRedirectMappingSchema };
