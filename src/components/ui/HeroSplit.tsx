'use client';

import React from 'react';
import type { BlockRendererProps } from '@/types/index';

/**
 * HeroSplit — NeoFlow's signature split-screen hero (copy left, visual right).
 * Fully token-driven: reads the active theme's CSS variables (display font,
 * colors, radius, shadow) so it adapts to any theme. Registered as the `split`
 * variant in the hero family (`src/lib/theme/component-registry.ts`).
 */
export const HeroSplit = ({ block }: BlockRendererProps) => {
  const content = React.useMemo(() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? JSON.parse(block.content)
        : {};
    } catch {
      return {};
    }
  }, [block.content]);

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
      <div
        className="mx-auto grid items-center gap-10 px-6 py-20 md:grid-cols-2"
        style={{ maxWidth: 'var(--layout-width, 1200px)' }}
      >
        {/* Left — copy */}
        <div className="flex flex-col items-start">
          <span
            className="mb-5 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{
              background: 'var(--color-surface, #f8fafc)',
              color: 'var(--color-primary, #4f46e5)',
              borderRadius: 'var(--radius-xl, 24px)',
            }}
          >
            {content.eyebrow || 'AI-native platform'}
          </span>
          <h1
            className="mb-5 text-4xl font-bold sm:text-5xl"
            style={{
              fontFamily: 'var(--font-display, var(--font-heading, inherit))',
              color: 'var(--color-text, #0f172a)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {content.title || 'Ship intelligent products, faster'}
          </h1>
          <p
            className="mb-8 max-w-md text-lg"
            style={{ color: 'var(--color-muted, #64748b)' }}
          >
            {content.description ||
              'A premium, AI-native design system for modern teams — minimal, fast and enterprise-grade.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#"
              className="px-6 py-3 text-base font-semibold text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-secondary, #7c3aed))',
                borderRadius: 'var(--radius-md, 12px)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {content.primaryButtonText || 'Get started'}
            </a>
            <a
              href="#"
              className="px-6 py-3 text-base font-semibold"
              style={{
                background: 'var(--color-surface, #f8fafc)',
                color: 'var(--color-text, #0f172a)',
                borderRadius: 'var(--radius-md, 12px)',
                border: '1px solid var(--color-muted, #e2e8f0)',
              }}
            >
              {content.secondaryButtonText || 'Book a demo'}
            </a>
          </div>
        </div>

        {/* Right — visual */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            borderRadius: 'var(--radius-2xl, 32px)',
            boxShadow: 'var(--shadow-xl)',
            background: 'var(--color-surface, #f8fafc)',
            aspectRatio: '4 / 3',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-accent, #06b6d4))',
              opacity: 0.92,
            }}
          />
          <div className="absolute inset-0 grid grid-cols-2 content-center gap-3 p-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16"
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  borderRadius: 'var(--radius-lg, 16px)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSplit;
