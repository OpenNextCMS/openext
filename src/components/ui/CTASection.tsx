import React from 'react';
import type { BlockRendererProps } from '@/types/index';

/**
 * Token-driven call-to-action band. Reads styling from theme CSS variables so
 * it re-themes automatically. Used by the variant registry / live preview for
 * the `cta` family. Content via `block.content` JSON ({ heading, subheading,
 * buttonText }); otherwise demo copy renders.
 */
export const CTASection = ({ block }: BlockRendererProps) => {
  const content = React.useMemo(() => {
    try {
      return typeof block?.content === 'string' && block.content.startsWith('{')
        ? (JSON.parse(block.content) as {
            heading?: string;
            subheading?: string;
            buttonText?: string;
          })
        : {};
    } catch {
      return {};
    }
  }, [block?.content]);

  const sectionStyle: React.CSSProperties = {
    padding: 'var(--section-spacing, 80px) var(--container-padding, 24px)',
    background: 'var(--color-primary, #2563eb)',
    color: 'var(--color-bg, #ffffff)',
    fontFamily: 'var(--font-body, inherit)',
    textAlign: 'center',
    ...(block?.style || {}),
  };

  return (
    <section style={sectionStyle}>
      <div style={{ maxWidth: 'var(--layout-width, 1200px)', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-heading, inherit)',
            fontSize: '2rem',
            marginBottom: 'var(--space-sm, 8px)',
            color: 'inherit',
          }}
        >
          {content.heading || 'Ready to get started?'}
        </h2>
        <p style={{ opacity: 0.9, marginBottom: 'var(--space-lg, 24px)', color: 'inherit' }}>
          {content.subheading || 'Join thousands of teams already building with us.'}
        </p>
        <button
          style={{
            background: 'var(--color-bg, #ffffff)',
            color: (block?.style?.backgroundColor as string) || 'var(--color-primary, #2563eb)',
            border: 'none',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '12px 28px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {content.buttonText || 'Get started free'}
        </button>
      </div>
    </section>
  );
};

export default CTASection;
