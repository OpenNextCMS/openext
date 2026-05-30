import React from 'react';
import type { BlogBlockType, ContentBlock } from '@/types/index';
import { sanitizeHtml } from './sanitize';
import AuthorBox from './AuthorBox';
import RelatedPosts from './RelatedPosts';
import type {
  HeadingData,
  ParagraphData,
  ImageData,
  GalleryData,
  VideoData,
  QuoteData,
  ButtonData,
  TableData,
  CodeData,
  FaqData,
  NewsletterData,
  CustomHtmlData,
} from './types';

// ---- Helpers ----
function videoEmbedUrl(url: string, provider: VideoData['provider']): string {
  if (provider === 'youtube') {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    return m?.[1] ? `https://www.youtube.com/embed/${m[1]}` : url;
  }
  if (provider === 'vimeo') {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m?.[1] ? `https://player.vimeo.com/video/${m[1]}` : url;
  }
  return url;
}

const buttonStyles: Record<ButtonData['style'], string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
  outline: 'border border-current hover:bg-muted',
};

// ---- Renderers (one per block type) ----
function HeadingRenderer({ data }: { data: HeadingData }) {
  const Tag = (data.level || 'h2') as keyof React.JSX.IntrinsicElements;
  const sizes: Record<string, string> = {
    h1: 'text-4xl',
    h2: 'text-3xl',
    h3: 'text-2xl',
    h4: 'text-xl',
  };
  return <Tag className={`mt-8 mb-3 font-bold ${sizes[data.level] ?? 'text-2xl'}`}>{data.text}</Tag>;
}

function ParagraphRenderer({ data }: { data: ParagraphData }) {
  return (
    <div
      className="prose max-w-none leading-relaxed [&>p]:my-4"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.text) }}
    />
  );
}

function ImageRenderer({ data }: { data: ImageData }) {
  if (!data.url) return null;
  return (
    <figure className="my-6">
      <img src={data.url} alt={data.alt} className="w-full rounded-2xl" loading="lazy" />
      {data.caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {data.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function GalleryRenderer({ data }: { data: GalleryData }) {
  if (!data.images?.length) return null;
  return (
    <div className="my-6 grid grid-cols-2 gap-3 md:grid-cols-3">
      {data.images.map((img, i) => (
        <img
          key={i}
          src={img.url}
          alt={img.alt}
          className="h-48 w-full rounded-xl object-cover"
          loading="lazy"
        />
      ))}
    </div>
  );
}

function VideoRenderer({ data }: { data: VideoData }) {
  if (!data.url) return null;
  if (data.provider === 'file') {
    return <video src={data.url} controls className="my-6 w-full rounded-2xl" />;
  }
  return (
    <div className="my-6 aspect-video w-full overflow-hidden rounded-2xl">
      <iframe
        src={videoEmbedUrl(data.url, data.provider)}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded video"
      />
    </div>
  );
}

function QuoteRenderer({ data }: { data: QuoteData }) {
  return (
    <blockquote className="my-6 border-l-4 border-primary pl-4 text-lg italic">
      <p>{data.text}</p>
      {data.cite ? <cite className="mt-2 block text-sm not-italic text-muted-foreground">— {data.cite}</cite> : null}
    </blockquote>
  );
}

function ButtonRenderer({ data }: { data: ButtonData }) {
  return (
    <div className="my-6">
      <a
        href={data.href || '#'}
        className={`inline-block rounded-[var(--radius,0.5rem)] px-6 py-3 font-semibold transition ${buttonStyles[data.style] ?? buttonStyles.primary}`}
      >
        {data.label}
      </a>
    </div>
  );
}

function DividerRenderer() {
  return <hr className="my-8 border-t" />;
}

function TableRenderer({ data }: { data: TableData }) {
  if (!data.rows?.length) return null;
  const [head, ...body] = data.hasHeader ? data.rows : [null, ...data.rows];
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        {data.hasHeader && head ? (
          <thead>
            <tr className="border-b bg-muted/40">
              {head.map((cell, i) => (
                <th key={i} className="px-3 py-2 font-semibold">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row, ri) =>
            row ? (
              <tr key={ri} className="border-b">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ) : null
          )}
        </tbody>
      </table>
    </div>
  );
}

function CodeRenderer({ data }: { data: CodeData }) {
  return (
    <pre className="my-6 overflow-x-auto rounded-2xl bg-gray-900 p-4 text-sm text-gray-100">
      <code data-language={data.language}>{data.code}</code>
    </pre>
  );
}

function FaqRenderer({ data }: { data: FaqData }) {
  if (!data.items?.length) return null;
  return (
    <div className="my-6 space-y-3">
      {data.items.map((item, i) => (
        <details key={i} className="rounded-xl border p-4">
          <summary className="cursor-pointer font-semibold">{item.q}</summary>
          <p className="mt-2 text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

function NewsletterRenderer({ data }: { data: NewsletterData }) {
  return (
    <div className="my-8 rounded-2xl bg-primary/5 p-8 text-center">
      <h3 className="mb-4 text-xl font-bold">{data.heading}</h3>
      <form className="mx-auto flex max-w-md gap-2" action="#">
        <input
          type="email"
          placeholder={data.placeholder}
          className="flex-1 rounded-[var(--radius,0.5rem)] border px-4 py-2"
        />
        <button
          type="submit"
          className="rounded-[var(--radius,0.5rem)] bg-primary px-5 py-2 font-semibold text-primary-foreground"
        >
          {data.buttonLabel}
        </button>
      </form>
    </div>
  );
}

function CustomHtmlRenderer({ data }: { data: CustomHtmlData }) {
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html) }} />;
}

/**
 * Registry of renderers keyed by block type. `BlockRenderer` looks blocks up
 * here; unknown types render nothing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const blockRegistry: Record<BlogBlockType, React.ComponentType<{ data: any }>> = {
  heading: HeadingRenderer,
  paragraph: ParagraphRenderer,
  image: ImageRenderer,
  gallery: GalleryRenderer,
  video: VideoRenderer,
  quote: QuoteRenderer,
  button: ButtonRenderer,
  divider: DividerRenderer,
  table: TableRenderer,
  code: CodeRenderer,
  faq: FaqRenderer,
  newsletter: NewsletterRenderer,
  'author-box': AuthorBox,
  'related-posts': RelatedPosts,
  'custom-html': CustomHtmlRenderer,
};

/** Render an ordered list of content blocks (skips hidden + unknown types). */
export function BlockRenderer({ blocks }: { blocks: ContentBlock[] | undefined | null }) {
  if (!blocks?.length) return null;
  return (
    <>
      {blocks.map((block) => {
        if (!block || block.hidden) return null;
        const Component = blockRegistry[block.type as BlogBlockType];
        if (!Component) return null;
        return <Component key={block.id} data={block.data} />;
      })}
    </>
  );
}

export default BlockRenderer;
