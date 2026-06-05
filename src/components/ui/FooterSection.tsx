import React from 'react';
import type { BlockRendererProps } from '@/types/index';

/**
 * Token-driven footer. Reads styling from theme CSS variables so it re-themes
 * automatically. Used by the variant registry / live preview for the `footer`
 * family. Content via `block.content` JSON ({ columns }); otherwise demo links.
 */
interface FooterColumn {
  title: string;
  links: string[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  { title: 'Product', links: ['Features', 'Pricing', 'Integrations'] },
  { title: 'Company', links: ['About', 'Careers', 'Blog'] },
  { title: 'Support', links: ['Help Center', 'Contact', 'Status'] },
];

export const FooterSection = ({ block }: BlockRendererProps) => {
  const content = React.useMemo(() => {
    try {
      return typeof block?.content === 'string' && block.content.startsWith('{')
        ? (JSON.parse(block.content) as { columns?: FooterColumn[] })
        : {};
    } catch {
      return {};
    }
  }, [block?.content]);

  const columns = content.columns?.length ? content.columns : DEFAULT_COLUMNS;

  return (
    <footer
      style={{
        padding: 'var(--space-xl, 40px) var(--container-padding, 24px)',
        background: 'var(--color-surface, #f8fafc)',
        color: 'var(--color-text, #111827)',
        fontFamily: 'var(--font-body, inherit)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--layout-width, 1200px)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-lg, 24px)',
        }}
      >
        {columns.map((col, i) => (
          <div key={i}>
            <h4 style={{ fontFamily: 'var(--font-heading, inherit)', marginBottom: 'var(--space-sm, 8px)' }}>
              {col.title}
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-xs, 4px)' }}>
              {col.links.map((link, li) => (
                <li key={li}>
                  <a href="#" style={{ color: 'var(--color-muted, #6b7280)', textDecoration: 'none' }}>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
};

export default FooterSection;
