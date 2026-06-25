import { Schema, model, models } from 'mongoose';
import type { IAuthorDocument } from '@/types/index';

// Blog authors. Kept as a dedicated collection in the page DB (rather than
// reusing the User model in the user DB) so posts can populate author profiles
// without cross-database joins. Page.authorId references this.
const AuthorSchema = new Schema<IAuthorDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    bio: { type: String },
    avatar: { type: String },
    socialLinks: {
      facebook: { type: String },
      twitter: { type: String },
      linkedin: { type: String },
      instagram: { type: String },
    },
  },
  { timestamps: true }
);

AuthorSchema.index({ name: 1 });

const AuthorModel = models.Author || model<IAuthorDocument>('Author', AuthorSchema);

export default AuthorModel;
export { AuthorSchema };
