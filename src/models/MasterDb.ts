import mongoose, { Schema, Document } from 'mongoose';

interface IMasterDb extends Document {
  userDbName: string;
  pageDbName: string;
  userDbUri: string; // Ensure this field is present
  pageDbUri: string; // Ensure this field is present
}

const MasterDbSchema: Schema = new Schema({
  userDbName: { type: String, required: true },
  pageDbName: { type: String, required: true },
  userDbUri: { type: String, required: true }, // Ensure this field is present
  pageDbUri: { type: String, required: true },
});

export const MasterDb =
  mongoose.models.MasterDb ||
  mongoose.model<IMasterDb>('MasterDb', MasterDbSchema);
