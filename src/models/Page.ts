import { Schema, model, models } from 'mongoose';
import { PageDocument, IModification } from '@/types/index';

// const ElementSchema = new Schema<Element>({
//   id: { type: String, required: true },
//   type: { type: String, required: true },
//   label: { type: String },
//   tag: { type: String },
//   className: { type: String },
//   text: { type: String },
//   content: { type: String },
//   style: { type: Schema.Types.Mixed },
//   attributes: { type: Schema.Types.Mixed },
//   events: { type: Schema.Types.Mixed },
//   children: [{ type: Schema.Types.Mixed }],
// });

// const ComponentSchema = new Schema<Component>({
//   name: { type: String, required: true },
//   data: { type: ElementSchema, required: true },
// });
const ModificationSchema = new Schema<IModification>({
  modifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  modifiedAt: { type: Date, default: Date.now },
});

// Typed block body for blog posts. `data` is schema-less (Mixed) so each block
// type can store its own shape (see the BlogBlockType union in types).
const ContentBlockSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    hidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const PageSchema = new Schema<PageDocument>(
  {
    pageName: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pageType: {
      type: String,
      enum: ['page', 'header', 'footer', 'blog'],
      default: 'page',
    },
    isPublished: { type: Boolean, default: false },
    isHome: { type: Boolean, default: false },
    isGlobal: { type: Boolean, default: false },
    preHeading: { type: String },
    description: { type: String },
    category: { type: String },
    authorName: { type: String },
    featuredImage: { type: String },
    publishDate: { type: Date },
    slug: { type: String, unique: true },
    seoName: { type: String },
    seoMeta: { type: String },
    component: { type: [Schema.Types.Mixed] },
    modifications: [ModificationSchema],

    // --- Blog-specific fields (only populated for pageType 'blog') ---
    excerpt: { type: String },
    contentBlocks: { type: [ContentBlockSchema], default: undefined },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    authorId: { type: Schema.Types.ObjectId, ref: 'Author' },
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: { type: [String], default: undefined },
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
    readingTime: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    slugHistory: { type: [String], default: undefined },
  },
  { timestamps: true }
);

// Create indexes for better query performance
PageSchema.index({ pageName: 1, createdBy: 1 });
PageSchema.index({ pageType: 1, isGlobal: 1 });
// Blog listing: filter by type + status, sorted by publish date.
PageSchema.index({ pageType: 1, status: 1, publishedAt: -1 });
PageSchema.index({ status: 1, publishedAt: -1 });

const PageModel = models.Page || model<PageDocument>('Page', PageSchema);

export default PageModel;
export { PageSchema };

// import mongoose, { Schema, Document, Types } from 'mongoose';

// interface Attribute {
//   [key: string]: string;
// }

// interface Element {
//   tag: string;
//   className?: string;
//   text?: string;
//   attributes?: Attribute;
//   events?: { [key: string]: string };
//   children?: Element[];
// }

// interface Component {
//   name: string; // This will store names like "header" or "body"
//   data: Element; // This will store the actual JSON structure
// }

// export interface PageDocument extends Document {
//   pageName: string;
//   createdBy: Types.ObjectId;
//   isPublished: boolean;
//   lastModified: Date;
//   preHeading: string;
//   description: string;
//   seoName: string;
//   seoMeta: string;
//   component: Component[];
// }

// const ElementSchema = new Schema<Element>({
//   tag: { type: String, required: true },
//   className: { type: String },
//   text: { type: String },
//   attributes: { type: Schema.Types.Mixed },
//   events: { type: Schema.Types.Mixed },
//   children: [{ type: Schema.Types.Mixed }],
// });

// const ComponentSchema = new Schema<Component>({
//   name: { type: String, required: true },
//   data: { type: ElementSchema, required: true }, // Store each component's structure
// });

// const PageSchema = new Schema<PageDocument>(
//   {
//     pageName: { type: String, required: true, trim: true },
//     createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     isPublished: { type: Boolean, default: false },
//     lastModified: { type: Date, default: Date.now },
//     preHeading: { type: String },
//     description: { type: String },
//     seoName: { type: String },
//     seoMeta: { type: String },
//     component: [ComponentSchema], // Array of components
//   },
//   { timestamps: true }
// );

// // Create indexes for better query performance
// PageSchema.index({ siteName: 1, createdBy: 1 });
// PageSchema.index({ pageName: 1, createdBy: 1 });

// const PageModel = mongoose.models.Page || mongoose.model<PageDocument>('Page', PageSchema);

// export default PageModel;
// export { PageSchema };
