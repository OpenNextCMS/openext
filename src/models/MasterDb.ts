import mongoose, { Schema, Document } from 'mongoose';

interface IMasterDb extends Document {
  userDbName: string;
  pageDbName: string;
  mongodbUri: string; // Add new field
}

const MasterDbSchema: Schema = new Schema({
  userDbName: { type: String, required: true },
  pageDbName: { type: String, required: true },
  mongodbUri: { type: String, required: true }, // Add new field
});

export const MasterDb = mongoose.model<IMasterDb>('MasterDb', MasterDbSchema);
