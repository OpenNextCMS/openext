import type { FilterQuery } from 'mongoose';
import { getPageDbConnection, getFormModel, getFormVersionModel, getFormSubmissionModel } from '@/utils/db';
import { generateUniqueSlug } from '@/lib/api/slug';
import { ApiError } from '@/lib/api/errors';
import type { IForm, IFormVersion, FormStatusValue } from '@/types/form-builder';
import { FormStatus } from '@/types/form-builder';
import {
  DEFAULT_FORM_SETTINGS,
  DEFAULT_FORM_ANALYTICS,
  MAX_EMBEDDED_VERSIONS,
} from '../constants';

/**
 * FormService — CRUD, versioning and lifecycle transitions for forms.
 * Every query is scoped to the per-tenant page DB; `tenantId` (the page-DB name)
 * is stamped on each document for traceability.
 */

export interface FormFilters {
  status?: FormStatusValue;
  search?: string;
  sortBy?: string;
}

export interface PaginationOpts {
  page: number;
  limit: number;
}

export interface CreateFormInput {
  name: string;
  slug?: string;
  description?: string;
  status?: FormStatusValue;
  fields?: IForm['fields'];
  // Permissive partial settings; merged over DEFAULT_FORM_SETTINGS.
  settings?: Record<string, unknown>;
}

export interface UpdateFormInput {
  name?: string;
  slug?: string;
  description?: string;
  status?: FormStatusValue;
  fields?: IForm['fields'];
  settings?: Record<string, unknown>;
}

function toPlainForm(doc: unknown): IForm {
  return doc as IForm;
}

export const FormService = {
  async createForm(tenantId: string, data: CreateFormInput, userId?: string): Promise<IForm> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);

    const slug = await generateUniqueSlug(Form, data.slug || data.name);
    const created = await Form.create({
      tenantId,
      name: data.name,
      slug,
      description: data.description ?? '',
      status: data.status ?? FormStatus.Draft,
      fields: data.fields ?? [],
      settings: { ...DEFAULT_FORM_SETTINGS, ...(data.settings ?? {}) } as IForm['settings'],
      analytics: { ...DEFAULT_FORM_ANALYTICS },
      versions: [],
      createdBy: userId,
      updatedBy: userId,
    });

    return toPlainForm(created.toObject());
  },

  async getForms(
    tenantId: string,
    filters: FormFilters,
    pagination: PaginationOpts
  ): Promise<{ forms: IForm[]; total: number }> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);

    const query: FilterQuery<Record<string, unknown>> = { tenantId };
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || '-updatedAt';
    const skip = (pagination.page - 1) * pagination.limit;

    const [items, total] = await Promise.all([
      Form.find(query)
        .sort(sortField)
        .skip(skip)
        .limit(pagination.limit)
        .lean()
        .exec(),
      Form.countDocuments(query),
    ]);

    return { forms: items as unknown as IForm[], total };
  },

  async getFormById(tenantId: string, id: string): Promise<IForm> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);
    const doc = await Form.findOne({ _id: id, tenantId }).lean().exec();
    if (!doc) throw new ApiError('Form not found', 404);
    return doc as unknown as IForm;
  },

  async getFormBySlug(tenantId: string, slug: string): Promise<IForm> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);
    const doc = await Form.findOne({ slug, tenantId }).lean().exec();
    if (!doc) throw new ApiError('Form not found', 404);
    return doc as unknown as IForm;
  },

  async updateForm(
    tenantId: string,
    id: string,
    data: UpdateFormInput,
    userId?: string
  ): Promise<IForm> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);

    const existing = await Form.findOne({ _id: id, tenantId }).exec();
    if (!existing) throw new ApiError('Form not found', 404);

    // Snapshot the current state before mutating.
    await FormService.createVersion(tenantId, id, userId);

    if (data.slug && data.slug !== existing.slug) {
      existing.slug = await generateUniqueSlug(Form, data.slug, { excludeId: id });
    }
    if (data.name !== undefined) existing.name = data.name;
    if (data.description !== undefined) existing.description = data.description;
    if (data.status !== undefined) existing.status = data.status;
    if (data.fields !== undefined) existing.fields = data.fields;
    if (data.settings !== undefined) {
      existing.settings = { ...existing.settings, ...data.settings } as IForm['settings'];
    }
    existing.updatedBy = userId as never;

    await existing.save();
    return existing.toObject() as unknown as IForm;
  },

  async deleteForm(tenantId: string, id: string): Promise<void> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);
    const Submission = getFormSubmissionModel(pageDb);
    const Version = getFormVersionModel(pageDb);

    const existing = await Form.findOne({ _id: id, tenantId }).select('_id').lean().exec();
    if (!existing) throw new ApiError('Form not found', 404);

    // Cascade: remove the form, its submissions and its version history.
    await Promise.all([
      Form.deleteOne({ _id: id, tenantId }),
      Submission.deleteMany({ formId: id, tenantId }),
      Version.deleteMany({ formId: id, tenantId }),
    ]);
  },

  async publishForm(tenantId: string, id: string, userId?: string): Promise<IForm> {
    return FormService.updateForm(tenantId, id, { status: FormStatus.Published }, userId);
  },

  async archiveForm(tenantId: string, id: string, userId?: string): Promise<IForm> {
    return FormService.updateForm(tenantId, id, { status: FormStatus.Archived }, userId);
  },

  async duplicateForm(tenantId: string, id: string, userId?: string): Promise<IForm> {
    const source = await FormService.getFormById(tenantId, id);
    return FormService.createForm(
      tenantId,
      {
        name: `${source.name} (copy)`,
        slug: `${source.slug}-copy`,
        description: source.description,
        status: FormStatus.Draft,
        fields: source.fields,
        settings: source.settings as unknown as Record<string, unknown>,
      },
      userId
    );
  },

  /** Snapshot the current form before an update; appends to both stores. */
  async createVersion(tenantId: string, formId: string, userId?: string): Promise<IFormVersion> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);
    const Version = getFormVersionModel(pageDb);

    const current = await Form.findOne({ _id: formId, tenantId }).lean().exec();
    if (!current) throw new ApiError('Form not found', 404);

    const last = await Version.findOne({ formId, tenantId }).sort('-version').select('version').lean().exec();
    const nextVersion = ((last as { version?: number } | null)?.version ?? 0) + 1;

    const snapshot = current as unknown as IForm;
    const created = await Version.create({
      tenantId,
      formId,
      version: nextVersion,
      snapshot,
      createdBy: userId,
    });

    // Mirror a compact entry on the form, capped to the most recent N.
    await Form.updateOne(
      { _id: formId, tenantId },
      {
        $push: {
          versions: {
            $each: [{ version: nextVersion, createdBy: userId, createdAt: new Date() }],
            $slice: -MAX_EMBEDDED_VERSIONS,
          },
        },
      }
    );

    return created.toObject() as unknown as IFormVersion;
  },

  async getVersions(tenantId: string, formId: string): Promise<IFormVersion[]> {
    const pageDb = await getPageDbConnection();
    const Version = getFormVersionModel(pageDb);
    const items = await Version.find({ formId, tenantId }).sort('-version').lean().exec();
    return items as unknown as IFormVersion[];
  },

  async restoreVersion(tenantId: string, formId: string, versionId: string): Promise<IForm> {
    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);
    const Version = getFormVersionModel(pageDb);

    const version = await Version.findOne({ _id: versionId, formId, tenantId }).lean().exec();
    if (!version) throw new ApiError('Version not found', 404);

    const snapshot = (version as unknown as IFormVersion).snapshot;
    const existing = await Form.findOne({ _id: formId, tenantId }).exec();
    if (!existing) throw new ApiError('Form not found', 404);

    existing.name = snapshot.name;
    existing.description = snapshot.description;
    existing.fields = snapshot.fields;
    existing.settings = snapshot.settings;
    // status/slug intentionally preserved on the live document.
    await existing.save();

    return existing.toObject() as unknown as IForm;
  },
};

export type FormServiceType = typeof FormService;
