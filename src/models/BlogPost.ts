import { Schema, model, models } from 'mongoose';
import { IBlogPostDocument, IModification } from '@/types/index';

const ModificationSchema = new Schema<IModification>({
  modifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  modifiedAt: { type: Date, default: Date.now },
});

const ContentBlockSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    hidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const BlogPostSchema = new Schema<IBlogPostDocument>(
  {
    pageName: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isPublished: { type: Boolean, default: false },
    slug: { type: String },
    modifications: [ModificationSchema],

    excerpt: { type: String },
    contentBlocks: { type: [ContentBlockSchema], default: [] },
    featuredImage: { type: String },
    category: { type: String },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    authorName: { type: String },
    authorId: { type: Schema.Types.ObjectId, ref: 'Author' },
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: { type: [String], default: [] },
      canonical: { type: String },
      ogImage: { type: String },
      index: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'archived'],
      default: 'draft',
    },
    publishedAt: { type: Date },
    scheduledAt: { type: Date },
    publishDate: { type: Date },
    readingTime: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    slugHistory: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Create indexes for better query performance
BlogPostSchema.index({ slug: 1 }, { unique: true });
BlogPostSchema.index({ pageName: 1, createdBy: 1 });
BlogPostSchema.index({ status: 1, publishedAt: -1 });

const BlogPostModel = models.BlogPost || model<IBlogPostDocument>('BlogPost', BlogPostSchema);

export default BlogPostModel;
export { BlogPostSchema };
