import mongoose from 'mongoose';

export interface IRole extends mongoose.Document {
	// Role name and numeric value
	name: string;
	value: number;
}

const roleSchema = new mongoose.Schema({
	name: { type: String, required: true, unique: true },
	value: { type: Number, required: true, unique: true },
}, {
	timestamps: true
});

export default mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);
export { roleSchema };
