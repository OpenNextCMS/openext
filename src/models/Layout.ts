import { Schema, model, models } from 'mongoose';
import type { ILayoutDocument } from '@/types/index';

// A composable blog layout (the index/template page), made of reorderable
// sections. Stored in the per-tenant page DB.
const SectionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    visible: { type: Boolean, default: true },
    settings: { type: Schema.Types.Mixed, default: {} },
    responsive: {
      desktop: { type: Schema.Types.Mixed, default: {} },
      tablet: { type: Schema.Types.Mixed, default: {} },
      mobile: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { _id: false }
);

const LayoutSchema = new Schema<ILayoutDocument>(
  {
    name: { type: String, required: true, trim: true, default: 'Blog Layout' },
    isActive: { type: Boolean, default: false },
    sections: { type: [SectionSchema], default: [] },
  },
  { timestamps: true }
);

const LayoutModel = models.Layout || model<ILayoutDocument>('Layout', LayoutSchema);

export default LayoutModel;
export { LayoutSchema };
