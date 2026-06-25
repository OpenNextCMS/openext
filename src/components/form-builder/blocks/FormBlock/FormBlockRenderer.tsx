'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { parseFormBlock } from './block.config';

const FormRenderer = dynamic(() => import('@/components/form-builder/renderer/FormRenderer'), {
  ssr: false,
});

/** Frontend view of the form block: title/description + the live form. */
export function FormBlockRenderer({ content }: { content: string | undefined }) {
  const props = parseFormBlock(content);

  if (!props.formId) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {props.showTitle && props.title ? (
        <h2 className="mb-1 text-2xl font-semibold">{props.title}</h2>
      ) : null}
      {props.showTitle && props.description ? (
        <p className="mb-4 text-muted-foreground">{props.description}</p>
      ) : null}
      <FormRenderer formId={props.formId} />
    </div>
  );
}
