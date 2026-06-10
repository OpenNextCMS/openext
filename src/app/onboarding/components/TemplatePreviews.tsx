'use client';

import type { HeaderId, FooterId } from '@/templates/types';

/**
 * Lightweight, dependency-free schematic previews for the header/footer styles.
 *
 * These intentionally do NOT render the real navbar/footer blocks: those depend
 * on a settings fetch, theme CSS variables and responsive breakpoints that don't
 * apply on the onboarding screen, which made them render blank. A simple, always-
 * visible mockup communicates each style reliably. The generated site still uses
 * the real blocks.
 */

const FRAME =
  'flex w-full flex-col overflow-hidden rounded-md border border-border bg-white text-gray-800';

function LinkText({ children }: { children: string }) {
  return <span className="text-[10px] font-medium text-gray-500">{children}</span>;
}

function Logo({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`max-w-[45%] truncate text-[11px] font-bold text-gray-900 ${className}`}>
      {name}
    </span>
  );
}

function Bar({ w = 'w-12' }: { w?: string }) {
  return <span className={`h-1.5 ${w} rounded-full bg-gray-200`} />;
}

export function HeaderPreview({
  id,
  businessName,
  links,
}: {
  id: HeaderId;
  businessName: string;
  links: { label: string }[];
}) {
  const labels = links.slice(0, 4).map((l) => l.label);

  if (id === 'centered') {
    return (
      <div className={`${FRAME} items-center gap-2 px-3 py-3`} style={{ height: 96 }}>
        <Logo name={businessName} className="max-w-[70%] text-center" />
        <div className="flex flex-wrap items-center justify-center gap-3">
          {labels.map((l) => (
            <LinkText key={l}>{l}</LinkText>
          ))}
        </div>
      </div>
    );
  }

  if (id === 'modern-saas') {
    return (
      <div className={`${FRAME} items-center justify-between px-3`} style={{ height: 96, flexDirection: 'row' }}>
        <Logo name={businessName} />
        <div className="flex items-center gap-3">
          {labels.slice(0, 3).map((l) => (
            <LinkText key={l}>{l}</LinkText>
          ))}
          <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
            Get Started
          </span>
        </div>
      </div>
    );
  }

  if (id === 'mega-menu') {
    return (
      <div className={`${FRAME} items-center justify-between px-3`} style={{ height: 96, flexDirection: 'row' }}>
        <Logo name={businessName} />
        <div className="flex items-center gap-3">
          <LinkText>Home</LinkText>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-500">
            Explore ▾
          </span>
          <LinkText>Contact</LinkText>
        </div>
      </div>
    );
  }

  if (id === 'sidebar') {
    return (
      <div className={`${FRAME} flex-row`} style={{ height: 96 }}>
        <div className="flex h-full w-1/3 flex-col gap-2 border-r border-border bg-gray-50 px-2 py-3">
          <Logo name={businessName} className="max-w-full" />
          {links.slice(0, 4).map((l) => (
            <LinkText key={l.label}>{l.label}</LinkText>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <Bar w="w-2/3" />
          <Bar w="w-1/2" />
          <Bar w="w-3/4" />
        </div>
      </div>
    );
  }

  // classic (default)
  return (
    <div className={`${FRAME} items-center justify-between px-3`} style={{ height: 96, flexDirection: 'row' }}>
      <Logo name={businessName} />
      <div className="flex items-center gap-3">
        {labels.map((l) => (
          <LinkText key={l}>{l}</LinkText>
        ))}
      </div>
    </div>
  );
}

function FooterColumn({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wide text-gray-700">{heading}</span>
      {items.map((it) => (
        <span key={it} className="text-[9px] text-gray-400">
          {it}
        </span>
      ))}
    </div>
  );
}

export function FooterPreview({
  id,
  businessName,
  links,
}: {
  id: FooterId;
  businessName: string;
  links: { label: string }[];
}) {
  const labels = links.slice(0, 4).map((l) => l.label);

  if (id === 'corporate') {
    return (
      <div className={`${FRAME} gap-3 px-3 py-3`} style={{ height: 150 }}>
        <Logo name={businessName} />
        <div className="grid grid-cols-3 gap-3">
          <FooterColumn heading="Company" items={['About', 'Careers', 'News']} />
          <FooterColumn heading="Services" items={labels.slice(0, 3)} />
          <FooterColumn heading="Legal" items={['Privacy', 'Terms']} />
        </div>
      </div>
    );
  }

  if (id === 'newsletter') {
    return (
      <div className={`${FRAME} gap-3 px-3 py-3`} style={{ height: 150 }}>
        <span className="text-[11px] font-bold text-gray-900">Join our newsletter</span>
        <div className="flex gap-2">
          <span className="h-6 flex-1 rounded border border-gray-200 bg-gray-50" />
          <span className="flex h-6 items-center rounded bg-primary px-2 text-[10px] font-semibold text-primary-foreground">
            Subscribe
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {labels.map((l) => (
            <LinkText key={l}>{l}</LinkText>
          ))}
        </div>
      </div>
    );
  }

  if (id === 'ecommerce') {
    return (
      <div className={`${FRAME} gap-3 px-3 py-3`} style={{ height: 150 }}>
        <Logo name={businessName} />
        <div className="grid grid-cols-4 gap-2">
          <FooterColumn heading="Shop" items={['New', 'Sale']} />
          <FooterColumn heading="Support" items={['Shipping', 'Returns']} />
          <FooterColumn heading="Company" items={['About', 'Stores']} />
          <FooterColumn heading="Legal" items={['Privacy', 'Terms']} />
        </div>
      </div>
    );
  }

  // simple (default)
  return (
    <div className={`${FRAME} items-center justify-center gap-2 px-3 py-4`} style={{ height: 150 }}>
      <Logo name={businessName} className="max-w-[70%] text-center" />
      <div className="flex flex-wrap items-center justify-center gap-3">
        {labels.map((l) => (
          <LinkText key={l}>{l}</LinkText>
        ))}
      </div>
      <span className="text-[9px] text-gray-400">© {businessName}. All rights reserved.</span>
    </div>
  );
}
