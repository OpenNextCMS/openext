import mongoose, { Schema, Document } from 'mongoose';

interface IMasterDb extends Document {
  userDbName: string;
  pageDbName: string;
}

const MasterDbSchema: Schema = new Schema({
  userDbName: { type: String, required: true },
  pageDbName: { type: String, required: true },
});

export const MasterDb = mongoose.model<IMasterDb>('MasterDb', MasterDbSchema);
