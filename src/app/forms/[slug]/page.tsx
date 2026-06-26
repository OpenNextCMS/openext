import { notFound } from 'next/navigation';
import { getPageDbConnection, getFormModel } from '@/utils/db';
import { getFormPluginState } from '@/lib/form-builder/lifecycle';
import FormRenderer from '@/components/form-builder/renderer/FormRenderer';
import type { IForm } from '@/types/form-builder';
import { FormStatus } from '@/types/form-builder';

export const revalidate = 60;

/** Public SSR page for a published form: /forms/<slug>. */
export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const state = await getFormPluginState();
  if (!state.installed || !state.enabled) notFound();

  const pageDb = await getPageDbConnection();
  const Form = getFormModel(pageDb);
  const doc = await Form.findOne({ slug, status: FormStatus.Published }).lean().exec();
  if (!doc) notFound();

  // Serialize Mongo types (ObjectId/Date) for the client component.
  const form = JSON.parse(JSON.stringify(doc)) as IForm;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">{form.name}</h1>
      {form.description ? <p className="mb-6 text-muted-foreground">{form.description}</p> : null}
      <FormRenderer form={form} />
    </main>
  );
}
