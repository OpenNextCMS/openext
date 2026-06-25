import React from 'react';
import { FileInput } from 'lucide-react';

/**
 * Page-builder block definition for embedding a published form. Matches the
 * existing block registry shape (see src/components/editor/data/blocks/*).
 */
export interface FormBlockProps {
  formId: string;
  title: string;
  description: string;
  showTitle: boolean;
}

export const FORM_BLOCK_DEFAULT_PROPS: FormBlockProps = {
  formId: '',
  title: '',
  description: '',
  showTitle: true,
};

export const formBlockConfig = {
  id: 'form-block',
  type: 'form-block' as const,
  label: 'Form',
  description: 'Embed a published form',
  icon: <FileInput className="mr-2 h-4 w-4 text-primary" />,
  content: JSON.stringify(FORM_BLOCK_DEFAULT_PROPS),
  style: { width: '100%', padding: '16px' } as React.CSSProperties,
};

/** Safe-parse a block's content JSON into FormBlockProps. */
export function parseFormBlock(content: string | undefined): FormBlockProps {
  if (!content) return { ...FORM_BLOCK_DEFAULT_PROPS };
  try {
    return { ...FORM_BLOCK_DEFAULT_PROPS, ...(JSON.parse(content) as Partial<FormBlockProps>) };
  } catch {
    return { ...FORM_BLOCK_DEFAULT_PROPS };
  }
}
