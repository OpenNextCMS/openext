'use client';

import React from 'react';
import type { BlockRendererProps } from '@/types/index';

interface BentoItem {
  title: string;
  description: string;
}

/**
 * FeatureBento — NeoFlow's bento-grid feature section: one large highlighted
 * tile plus supporting tiles in an asymmetric grid. Token-driven (colors,
 * display font, 2xl radius, xl shadow) so it adapts to the active theme.
 * Registered as the `bento` variant in the features family.
 */
export const FeatureBento = ({ block }: BlockRendererProps) => {
  const content = React.useMemo(() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? JSON.parse(block.content)
        : {};
    } catch {
      return {};
    }
  }, [block.content]);

  const items: BentoItem[] = content.features || [
    { title: 'Intelligent automation', description: 'AI that adapts to your workflow and anticipates the next step.' },
    { title: 'Realtime sync', description: 'Always-on, always fresh across every device.' },
    { title: 'Enterprise security', description: 'SOC 2, SSO and granular roles by default.' },
    { title: 'Composable blocks', description: 'Build any layout from a clean set of primitives.' },
    { title: 'Edge performance', description: 'Sub-second loads, everywhere.' },
  ];

  return (
    <section
      className="w-full"
      style={{
        background: 'var(--color-bg, #ffffff)',
        color: 'var(--color-text, #0f172a)',
        fontFamily: 'var(--font-body, inherit)',
        ...block.style,
      }}
    >
      <div className="mx-auto px-6 py-20" style={{ maxWidth: 'var(--layout-width, 1200px)' }}>
        <h2
          className="mb-3 text-3xl font-bold sm:text-4xl"
          style={{
            fontFamily: 'var(--font-display, var(--font-heading, inherit))',
            color: 'var(--color-text, #0f172a)',
            letterSpacing: '-0.02em',
          }}
        >
          {content.title || 'Everything you need, nothing you don’t'}
        </h2>
        <p className="mb-10 max-w-xl text-lg" style={{ color: 'var(--color-muted, #64748b)' }}>
          {content.subtitle || 'A composable, AI-native toolkit built for speed and scale.'}
        </p>

        <div className="grid auto-rows-[minmax(150px,1fr)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f, i) => {
            const span =
              i === 0 ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2' : i === 3 ? 'lg:col-span-2' : '';
            const accent = i === 0;
            return (
              <div
                key={i}
                className={`flex flex-col justify-between p-6 ${span}`}
                style={{
                  background: accent
                    ? 'linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-secondary, #7c3aed))'
                    : 'var(--color-surface, #f8fafc)',
                  color: accent ? '#ffffff' : 'var(--color-text, #0f172a)',
                  borderRadius: 'var(--radius-2xl, 32px)',
                  boxShadow: accent ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
                  border: accent ? 'none' : '1px solid var(--color-surface, #e2e8f0)',
                }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center text-sm font-bold"
                  style={{
                    background: accent ? 'rgba(255,255,255,0.2)' : 'var(--color-bg, #ffffff)',
                    color: accent ? '#ffffff' : 'var(--color-primary, #4f46e5)',
                    borderRadius: 'var(--radius-md, 12px)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3
                    className={accent ? 'mb-1 text-xl font-semibold' : 'mb-1 text-lg font-semibold'}
                    style={{ fontFamily: 'var(--font-heading, inherit)' }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: accent ? 'rgba(255,255,255,0.88)' : 'var(--color-muted, #64748b)' }}
                  >
                    {f.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureBento;
