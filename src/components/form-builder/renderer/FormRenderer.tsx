'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { IForm, IFormField } from '@/types/form-builder';
import { buildZodSchema, validateSubmission } from '@/lib/form-builder/validation';
import { evaluateConditions } from '@/lib/form-builder/conditionalLogic';
import { HONEYPOT_FIELD_NAME } from '@/lib/form-builder/constants';
import { FieldControl } from '@/components/form-builder/fields/registry';

interface Props {
  /** Provide a pre-fetched form (SSR), or a formId/slug to fetch on the client. */
  form?: IForm;
  formId?: string;
}

type Values = Record<string, unknown>;

function initialValues(fields: IFormField[]): Values {
  const v: Values = {};
  for (const f of fields) {
    if (f.type === 'checkbox' && f.options?.length) v[f.id] = [];
    else if (f.defaultValue != null) v[f.id] = f.defaultValue;
  }
  return v;
}

export default function FormRenderer({ form: initialForm, formId }: Props) {
  const [form, setForm] = useState<IForm | null>(initialForm ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Values>(() => initialValues(initialForm?.fields ?? []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const startedRef = useRef(false);

  const id = form?._id ?? formId;

  // Fetch when only an id/slug was provided.
  useEffect(() => {
    if (initialForm || !formId) return;
    let active = true;
    fetch(`/api/forms/render/${formId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        if (j?.data) {
          setForm(j.data as IForm);
          setValues(initialValues((j.data as IForm).fields ?? []));
        } else setLoadError(j?.error?.message || 'Form unavailable');
      })
      .catch(() => active && setLoadError('Form unavailable'));
    return () => {
      active = false;
    };
  }, [formId, initialForm]);

  // Track a view once we have a form id.
  useEffect(() => {
    if (!id) return;
    fetch(`/api/forms/${id}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'view' }),
    }).catch(() => {});
  }, [id]);

  const fields = useMemo(() => form?.fields ?? [], [form]);
  const condState = useMemo(() => evaluateConditions(fields, values), [fields, values]);

  const multiStep = form?.settings.multiStep.enabled;
  const steps = useMemo(() => {
    if (!multiStep) return [1];
    const s = new Set<number>([1]);
    fields.forEach((f) => s.add(f.step ?? 1));
    return Array.from(s).sort((a, b) => a - b);
  }, [multiStep, fields]);

  if (loadError) return <p className="text-sm text-red-500">{loadError}</p>;
  if (!form) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
        <p className="font-medium">{done}</p>
      </div>
    );
  }

  const onChange = (fieldId: string, value: unknown) => {
    if (!startedRef.current && id) {
      startedRef.current = true;
      fetch(`/api/forms/${id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'start' }),
      }).catch(() => {});
    }
    setValues((v) => ({ ...v, [fieldId]: value }));
  };

  const stepFields = (multiStep ? fields.filter((f) => (f.step ?? 1) === step) : fields).filter(
    (f) => condState[f.id]?.visible !== false
  );

  const validateCurrent = (): boolean => {
    const subset = stepFields.map((f) => ({ ...f, required: !!condState[f.id]?.required }));
    const res = validateSubmission(buildZodSchema(subset), values);
    setErrors(res.errors);
    return res.valid;
  };

  const submit = async () => {
    // Full validation across visible fields.
    const visible = fields
      .filter((f) => condState[f.id]?.visible !== false)
      .map((f) => ({ ...f, required: !!condState[f.id]?.required }));
    const res = validateSubmission(buildZodSchema(visible), values);
    if (!res.valid) {
      setErrors(res.errors);
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/forms/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: values }),
      });
      const j = await r.json();
      if (!r.ok || j?.error) {
        if (j?.error?.fields) setErrors(j.error.fields);
        throw new Error(j?.error?.message || 'Submission failed');
      }
      const payload = j.data as { message?: string; redirectUrl?: string };
      if (payload.redirectUrl) {
        window.location.href = payload.redirectUrl;
        return;
      }
      setDone(payload.message || form.settings.successMessage);
    } catch {
      // error surfaced via field errors / message
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = !multiStep || step === steps[steps.length - 1];
  const progress = multiStep ? (steps.indexOf(step) + 1) / steps.length : 1;

  return (
    <form
      className="blog-theme-scope space-y-4"
      style={{ fontFamily: 'var(--font-body, inherit)' }}
      onSubmit={(e) => {
        e.preventDefault();
        if (isLastStep) submit();
        else if (validateCurrent()) setStep(steps[steps.indexOf(step) + 1]);
      }}
      noValidate
    >
      {multiStep && form.settings.multiStep.showProgressBar ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-[var(--color-primary,#2563eb)]" style={{ width: `${progress * 100}%` }} />
        </div>
      ) : null}

      <div className="flex flex-wrap -mx-1">
        {stepFields.map((field) => (
          <FieldControl
            key={field.id}
            field={field}
            value={values[field.id]}
            error={errors[field.id]}
            disabled={submitting}
            onChange={(val) => onChange(field.id, val)}
          />
        ))}
      </div>

      {/* Honeypot — always rendered, never visible, never labeled. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
        <input
          type="text"
          name={HONEYPOT_FIELD_NAME}
          tabIndex={-1}
          autoComplete="off"
          value={(values[HONEYPOT_FIELD_NAME] as string) ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [HONEYPOT_FIELD_NAME]: e.target.value }))}
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {multiStep && step !== steps[0] && form.settings.multiStep.allowBack ? (
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => setStep(steps[steps.indexOf(step) - 1])}
          >
            Previous
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-[var(--color-primary,#2563eb)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          {isLastStep ? form.settings.submitButtonText : 'Next'}
        </button>
      </div>
    </form>
  );
}
