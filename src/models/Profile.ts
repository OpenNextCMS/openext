import mongoose from 'mongoose';

export interface IProfile extends mongoose.Document {
  userId: mongoose.Schema.Types.ObjectId;
  firstName: string;
  lastName: string;
  nickname: string;
  displayName: string;
  website?: string;
  bio?: string;
}

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  nickname: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  website: {
    type: String
  },
  bio: {
    type: String
  }
}, {
  timestamps: true
});

const Profile = mongoose.models.Profile || mongoose.model<IProfile>('Profile', profileSchema);

export default Profile;
export { profileSchema, IProfile };
