import { Schema, model, models } from 'mongoose';
import type { MenuRedirectHistoryDocument } from '@/types/menu-redirect';

// Append-only audit log (page DB), including lifecycle + mapping events.
const MenuRedirectHistorySchema = new Schema<MenuRedirectHistoryDocument>(
  {
    action: {
      type: String,
      enum: [
        'plugin-installed',
        'plugin-enabled',
        'plugin-disabled',
        'plugin-uninstalled',
        'mapping-created',
        'mapping-updated',
        'mapping-deleted',
        'bulk-auto-match',
      ],
      required: true,
    },
    menuItemId: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MenuRedirectHistorySchema.index({ createdAt: -1 });
MenuRedirectHistorySchema.index({ menuItemId: 1, createdAt: -1 });

const MenuRedirectHistoryModel =
  models.MenuRedirectHistory ||
  model<MenuRedirectHistoryDocument>('MenuRedirectHistory', MenuRedirectHistorySchema);

export default MenuRedirectHistoryModel;
export { MenuRedirectHistorySchema };
