import React from 'react';
import type { SectionType, LayoutSection } from '@/types/index';
import AuthorBox from '@/components/blog/blocks/AuthorBox';
import {
  LatestPostsSection,
  FeaturedPostSection,
  CategoriesSection,
  SidebarSection,
} from './dynamicSections';
import { visibilityClasses } from './sections';

type S = Record<string, unknown>;

// ---- Static (presentational) sections ----
function HeroSection({ settings }: { settings: S }) {
  return (
    <section className="relative overflow-hidden bg-primary/5 px-4 py-20 text-center">
      {settings.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(settings.image)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      ) : null}
      <div className="relative mx-auto max-w-3xl space-y-4">
        <h1 className="text-4xl font-black tracking-tighter md:text-6xl">
          {String(settings.heading || 'Our Blog')}
        </h1>
        {settings.subheading ? (
          <p className="text-lg text-muted-foreground">{String(settings.subheading)}</p>
        ) : null}
      </div>
    </section>
  );
}

function NewsletterSection({ settings }: { settings: S }) {
  return (
    <section className="mx-auto my-10 max-w-3xl rounded-3xl bg-primary/5 px-4 py-12 text-center">
      <h2 className="mb-4 text-2xl font-bold">{String(settings.heading || 'Subscribe')}</h2>
      <form className="mx-auto flex max-w-md gap-2" action="#">
        <input
          type="email"
          placeholder="you@example.com"
          className="flex-1 rounded-[var(--radius,0.5rem)] border px-4 py-2"
        />
        <button
          type="submit"
          className="rounded-[var(--radius,0.5rem)] bg-primary px-5 py-2 font-semibold text-primary-foreground"
        >
          {String(settings.buttonLabel || 'Subscribe')}
        </button>
      </form>
    </section>
  );
}

function CtaBand({ settings }: { settings: S }) {
  return (
    <section className="mx-auto my-10 max-w-6xl rounded-3xl bg-gray-900 px-6 py-12 text-center text-white">
      <h2 className="mb-4 text-3xl font-bold">{String(settings.heading || 'Ready to get started?')}</h2>
      <a
        href={String(settings.href || '#')}
        className="inline-block rounded-[var(--radius,0.5rem)] bg-primary px-6 py-3 font-semibold text-primary-foreground"
      >
        {String(settings.buttonLabel || 'Get started')}
      </a>
    </section>
  );
}

function AuthorSection({ settings }: { settings: S }) {
  if (!settings.authorId) return null;
  return (
    <div className="mx-auto max-w-3xl px-4">
      <AuthorBox data={{ authorId: String(settings.authorId) }} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sectionRegistry: Record<SectionType, React.ComponentType<{ settings: any }>> = {
  hero: HeroSection,
  'featured-post': FeaturedPostSection,
  'latest-posts': LatestPostsSection,
  categories: CategoriesSection,
  sidebar: SidebarSection,
  newsletter: NewsletterSection,
  cta: CtaBand,
  author: AuthorSection,
  'footer-cta': CtaBand,
};

export function getSectionComponent(type: SectionType) {
  return sectionRegistry[type];
}

/** Render a single section (used by both the public page and the builder preview). */
export function SectionRenderer({ section }: { section: LayoutSection }) {
  const Component = sectionRegistry[section.type];
  if (!Component) return null;
  return <Component settings={section.settings} />;
}

/** Render a full layout: ordered, visible sections with responsive visibility. */
export function LayoutRenderer({ layout }: { layout: { sections: LayoutSection[] } | null | undefined }) {
  if (!layout?.sections?.length) return null;
  return (
    <>
      {layout.sections
        .filter((s) => s.visible)
        .map((section) => (
          <div key={section.id} className={visibilityClasses(section)}>
            <SectionRenderer section={section} />
          </div>
        ))}
    </>
  );
}

export default LayoutRenderer;
