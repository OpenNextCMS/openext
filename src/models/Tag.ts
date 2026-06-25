import { Schema, model, models } from 'mongoose';
import type { ITagDocument } from '@/types/index';

// Blog tags, stored in the per-tenant page DB. Slug is unique per tenant DB.
const TagSchema = new Schema<ITagDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
  },
  { timestamps: true }
);

TagSchema.index({ slug: 1 }, { unique: true });

const TagModel = models.Tag || model<ITagDocument>('Tag', TagSchema);

export default TagModel;
export { TagSchema };
