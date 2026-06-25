import { Schema, model, models } from 'mongoose';
import type { ICommentDocument } from '@/types/index';

// Public comments on blog posts. blogId references a Page (pageType 'blog').
// New comments default to "pending" and require admin approval before display.
const CommentSchema = new Schema<ICommentDocument>(
  {
    blogId: { type: Schema.Types.ObjectId, ref: 'Page', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    comment: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'spam'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Fast lookup of a post's approved comments, newest first.
CommentSchema.index({ blogId: 1, status: 1, createdAt: -1 });

const CommentModel = models.Comment || model<ICommentDocument>('Comment', CommentSchema);

export default CommentModel;
export { CommentSchema };
