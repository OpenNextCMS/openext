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
<<<<<<< HEAD
    slug: { type: String },
=======
    category: { type: String },
    authorName: { type: String },
    featuredImage: { type: String },
    publishDate: { type: Date },
    slug: { type: String, unique: true },
>>>>>>> khadija
    seoName: { type: String },
    seoMeta: { type: String },
    component: { type: [Schema.Types.Mixed] },
    modifications: [ModificationSchema],
  },
  { timestamps: true }
);

// Create indexes for better query performance
PageSchema.index({ slug: 1 }, { unique: true });
PageSchema.index({ pageName: 1, createdBy: 1 });
PageSchema.index({ pageType: 1, isGlobal: 1 });

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
