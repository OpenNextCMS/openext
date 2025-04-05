import { Schema, model, models } from 'mongoose';
import { PageDocument, Component, Element, IModification } from '@/types/index';

const ElementSchema = new Schema<Element>({
  tag: { type: String, required: true },
  className: { type: String },
  text: { type: String },
  attributes: { type: Schema.Types.Mixed },
  events: { type: Schema.Types.Mixed },
  children: [{ type: Schema.Types.Mixed }],
});

const ComponentSchema = new Schema<Component>({
  name: { type: String, required: true },
  data: { type: ElementSchema, required: true },
});
const ModificationSchema = new Schema<IModification>({
  modifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  modifiedAt: { type: Date, default: Date.now }
});
const PageSchema = new Schema<PageDocument>(
  {
    pageName: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false },
    preHeading: { type: String },
    description: { type: String },
    slug: { type: String, unique: true },
    seoName: { type: String },
    seoMeta: { type: String },
    component: [ComponentSchema],
    modifications: [ModificationSchema]
  },
  { timestamps: true }
);

// Create indexes for better query performance
PageSchema.index({ pageName: 1, createdBy: 1 });

const PageModel = models.Page || model<PageDocument>('Page', PageSchema);

export default PageModel;
export { PageSchema };