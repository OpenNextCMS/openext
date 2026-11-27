import Link from 'next/link';
import type { CSSProperties } from 'react';

type EditThisPageButtonProps = {
  pageSlug: string;
  pageId: string;
  userId: string;
  pageName?: string;
  pageType?: 'page' | 'header' | 'footer';
};

const barStyle: CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const linkBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 999,
  color: '#fff',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.28)',
  border: '1px solid rgba(255,255,255,0.12)',
};

/**
 * Fixed controls for logged-in users on public `/` and `/[slug]`:
 * Dashboard + open Editor for the page currently being viewed.
 */
export default function EditThisPageButton({
  pageSlug,
  pageId,
  userId,
  pageName,
  pageType = 'page',
}: EditThisPageButtonProps) {
  const editHref = `/Editor?pagename=${encodeURIComponent(pageSlug)}&userId=${encodeURIComponent(userId)}&pageId=${encodeURIComponent(pageId)}&pageType=${encodeURIComponent(pageType)}`;
  const editLabel = pageName?.trim() ? `Edit “${pageName.trim()}”` : 'Edit this page';

  return (
    <div data-edit-this-page="true" data-logged-in-site-toolbar="true" style={barStyle}>
      <Link
        href="/dashboard"
        title="Go to Dashboard"
        style={{ ...linkBase, background: '#1e293b' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
            fill="currentColor"
          />
        </svg>
        <span>Dashboard</span>
      </Link>

      <Link
        href={editHref}
        title={editLabel}
        style={{ ...linkBase, background: '#0f172a' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M12 20h9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Edit this page</span>
      </Link>
    </div>
  );
}
