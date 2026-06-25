import React from 'react';
import type { BlockRendererProps } from '@/types/index';

interface Plan {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
}

const DEFAULT_PLANS: Plan[] = [
  { name: 'Starter', price: '$9', period: '/mo', features: ['1 project', 'Basic support', '1 GB storage'] },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    features: ['Unlimited projects', 'Priority support', '50 GB storage', 'Analytics'],
    highlighted: true,
  },
  { name: 'Enterprise', price: '$99', period: '/mo', features: ['SSO', 'Dedicated support', 'Unlimited storage', 'SLA'] },
];

/**
 * Token-driven pricing section. Reads all visual styling from theme CSS
 * variables (`var(--token, fallback)`) so it re-themes automatically. Used by
 * the variant registry / live preview for the `pricing` family. Content can be
 * supplied via `block.content` JSON ({ plans }); otherwise demo plans render.
 */
export const PricingTable = ({ block }: BlockRendererProps) => {
  const content = React.useMemo(() => {
    try {
      return typeof block?.content === 'string' && block.content.startsWith('{')
        ? (JSON.parse(block.content) as { plans?: Plan[] })
        : {};
    } catch {
      return {};
    }
  }, [block?.content]);

  const plans = content.plans?.length ? content.plans : DEFAULT_PLANS;

  return (
    <section
      style={{
        padding: 'var(--section-spacing, 80px) var(--container-padding, 24px)',
        background: 'var(--color-bg, #ffffff)',
        color: 'var(--color-text, #111827)',
        fontFamily: 'var(--font-body, inherit)',
      }}
    >
      <div style={{ maxWidth: 'var(--layout-width, 1200px)', margin: '0 auto' }}>
        <h2
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-heading, inherit)',
            fontSize: '2rem',
            marginBottom: 'var(--space-xl, 40px)',
          }}
        >
          Simple, transparent pricing
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-lg, 24px)',
          }}
        >
          {plans.map((plan, i) => (
            <div
              key={i}
              style={{
                background: 'var(--color-surface, #f8fafc)',
                border: plan.highlighted
                  ? '2px solid var(--color-primary, #2563eb)'
                  : '1px solid rgba(0,0,0,0.08)',
                borderRadius: 'var(--radius-lg, 16px)',
                boxShadow: plan.highlighted ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                padding: 'var(--space-xl, 40px) var(--space-lg, 24px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md, 16px)',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-heading, inherit)', fontSize: '1.25rem' }}>
                {plan.name}
              </h3>
              <div>
                <span style={{ fontSize: '2.25rem', fontWeight: 700 }}>{plan.price}</span>
                <span style={{ color: 'var(--color-muted, #6b7280)' }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-sm, 8px)' }}>
                {plan.features.map((f, fi) => (
                  <li key={fi} style={{ color: 'var(--color-muted, #6b7280)' }}>
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <button
                style={{
                  marginTop: 'auto',
                  background: plan.highlighted ? 'var(--color-primary, #2563eb)' : 'transparent',
                  color: plan.highlighted ? 'var(--color-bg, #fff)' : 'var(--color-primary, #2563eb)',
                  border: '1px solid var(--color-primary, #2563eb)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Get started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingTable;
