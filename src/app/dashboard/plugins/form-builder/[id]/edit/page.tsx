'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { FormBuilderGate } from '@/components/form-builder/FormBuilderGate';

// Lazy-load the heavy builder (no SSR) per the performance requirement.
const FormBuilder = dynamic(() => import('@/components/form-builder/builder/FormBuilder'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading builder…
    </div>
  ),
});

export default function EditFormPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  return (
    <FormBuilderGate>
      {id ? <FormBuilder formId={id} /> : null}
    </FormBuilderGate>
  );
}
