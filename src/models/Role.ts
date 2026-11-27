import mongoose from 'mongoose';

export type RoleType = 'system' | 'custom' | 'plugin';

export interface IRole extends mongoose.Document {
  name: string;
  value: number;
  /** system = core 0–3, custom = admin-defined 4–99, plugin = manifest-defined ≥100 */
  type?: RoleType;
  /** Maximum capability tier for custom roles (inherits ceiling from this core role). */
  baseRole?: number;
  /** CMS capabilities granted to custom roles (subset of baseRole caps). */
  capabilities?: string[];
  /** Blog editor block types allowed for this custom role. */
  allowedComponents?: string[];
  /** Installed+active plugin ids this custom role may see/use. Undefined = unrestricted (all active plugins). */
  allowedPlugins?: string[];
  /**
   * Per-plugin page/feature access for custom roles.
   * Only applies to plugins listed in allowedPlugins.
   * Missing entry for an allowed plugin = all pages/features.
   */
  pluginPageAccess?: Array<{
    pluginId: string;
    pages: Array<{ id: string; features: string[] | '*' }>;
    /** Subset of that plugin's manifest permissions. Omit = all plugin permissions. */
    permissions?: string[];
  }>;
  /** For type=plugin: which plugin registered this role. */
  pluginId?: string;
}

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    value: { type: Number, required: true, unique: true },
    type: {
      type: String,
      enum: ['system', 'custom', 'plugin'],
      required: false,
    },
    baseRole: { type: Number, required: false },
    capabilities: { type: [String], default: undefined },
    /** Blog editor block types this custom role may use (e.g. heading, paragraph). */
    allowedComponents: { type: [String], default: undefined },
    /** Installed+active plugin ids this custom role may see/use. Unset = unrestricted. */
    allowedPlugins: { type: [String], default: undefined },
    /** Per-plugin pages/features/permissions for custom roles. */
    pluginPageAccess: {
      type: [
        {
          pluginId: { type: String, required: true },
          pages: [
            {
              id: { type: String, required: true },
              features: { type: mongoose.Schema.Types.Mixed, default: '*' },
            },
          ],
          permissions: { type: [String], default: undefined },
        },
      ],
      default: undefined,
    },
    /** For type=plugin: plugin that registered this role. */
    pluginId: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);
export { roleSchema };
