import mongoose, { Schema, Document, Types } from "mongoose";

interface Attribute {
  [key: string]: string;
}

interface Element {
  tag: string;
  className?: string;
  text?: string;
  attributes?: Attribute;
  events?: { [key: string]: string };
  children?: Element[];
}

interface Component {
  name: string; // This will store names like "header" or "body"
  data: Element; // This will store the actual JSON structure
}

export interface PageDocument extends Document {
  pageName: string;
  createdBy: Types.ObjectId;
  isPublished: boolean;
  lastModified: Date;
  component: Component[];
}

const ElementSchema = new Schema<Element>({
  tag: { type: String, required: true },
  className: { type: String },
  text: { type: String },
  attributes: { type: Schema.Types.Mixed },
  events: { type: Schema.Types.Mixed },
  children: [{ type: Schema.Types.Mixed }]
});

const ComponentSchema = new Schema<Component>({
  name: { type: String, required: true },
  data: { type: ElementSchema, required: true } // Store each component's structure
});

const PageSchema = new Schema<PageDocument>(
  {
    pageName: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: false },
    lastModified: { type: Date, default: Date.now },
    component: [ComponentSchema] // Array of components
  },
  { timestamps: true }
);

// Create indexes for better query performance
PageSchema.index({ siteName: 1, createdBy: 1 });
PageSchema.index({ pageName: 1, createdBy: 1 });

const PageModel = mongoose.models.Page || mongoose.model<PageDocument>("Page", PageSchema);

export default PageModel;
export { PageSchema };
