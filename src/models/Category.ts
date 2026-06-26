import { Schema, model, models } from 'mongoose';
import type { ICategoryDocument } from '@/types/index';

// Blog categories live in the per-tenant *page* DB (same DB as blog Pages),
// so they can be populated alongside posts. Tenancy is by database, so the
// slug only needs to be unique within this collection (no websiteId field).
const CategorySchema = new Schema<ICategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    image: { type: String },
    // Self-reference for nested categories. Nullable for top-level categories.
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { timestamps: true }
);

CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentCategory: 1 });

const CategoryModel = models.Category || model<ICategoryDocument>('Category', CategorySchema);

export default CategoryModel;
export { CategorySchema };
