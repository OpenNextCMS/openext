import mongoose from 'mongoose';

export interface IPage extends mongoose.Document {
  siteName: string;
  pageName: string;
  createdBy: mongoose.Types.ObjectId;
  data: {
    html: string;
    css: string;
    components: mongoose.Schema.Types.Mixed;
    styles: mongoose.Schema.Types.Mixed;
  };
  isPublished: boolean;
  lastModified: Date;
}

const pageSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true
  },
  pageName: {
    type: String,
    required: [true, 'Page name is required'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  data: {
    html: {
      type: String,
      required: true
    },
    css: {
      type: String,
      required: true
    },
    components: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    styles: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
pageSchema.index({ siteName: 1, createdBy: 1 });
pageSchema.index({ pageName: 1, createdBy: 1 });

const Page = mongoose.models.Page || mongoose.model<IPage>('Page', pageSchema);

export default Page;
export { pageSchema, IPage };