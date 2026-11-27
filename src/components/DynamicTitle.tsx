'use client';
import { apiUrl } from '@/lib/apiClient';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { resolveSiteIconUrl } from '@/lib/media/siteIcon';

const resolveSiteIcon = (siteIcon?: string) => {
  return resolveSiteIconUrl(siteIcon) || '/img/default_site_icon.png';
};

/** Routes where Next.js `generateMetadata` owns the document title — do not overwrite. */
function isPublicContentPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  if (
    p.startsWith('/dashboard') ||
    p.startsWith('/editor') ||
    p.startsWith('/login') ||
    p.startsWith('/admin') ||
    p.startsWith('/api') ||
    p.startsWith('/language') ||
    p.startsWith('/database-choice') ||
    p.startsWith('/mongodb-setup') ||
    p.startsWith('/mysql-setup') ||
    p.startsWith('/postgres-setup')
  ) {
    return false;
  }
  return true;
}

export default function DynamicTitle() {
  const [title, setTitle] = useState<string | null>(null);
  const [icon, setIcon] = useState('/favicon.ico');

  const pathname = usePathname();
  const lastSegment = pathname?.split('/').filter(Boolean).pop();
  const preserveSeoTitle = isPublicContentPath(pathname);

  useEffect(() => {
    async function fetchSiteSettings() {
      try {
        const res = await fetch(apiUrl(`/api/dashboard/settings`), {
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          const siteTitle = data?.data?.settings?.siteTitle || 'Next.js Setup Project';
          const siteIcon = resolveSiteIcon(data?.data?.settings?.siteIcon);
          setIcon(siteIcon);

          // Public pages/blogs keep SSR metadata titles (seoName / blog seo.title).
          if (!preserveSeoTitle) {
            setTitle(lastSegment ? `${lastSegment} | ${siteTitle}` : siteTitle);
          } else {
            setTitle(null);
          }
        } else {
          setIcon('/favicon.ico');
          if (!preserveSeoTitle) {
            setTitle(
              lastSegment ? `${lastSegment} | Next.js Setup Project` : 'Next.js Setup Project'
            );
          } else {
            setTitle(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch site settings:', error);
        setIcon('/favicon.ico');
        if (!preserveSeoTitle) setTitle('Next.js Setup Project');
        else setTitle(null);
      }
    }

    fetchSiteSettings();
  }, [lastSegment, preserveSeoTitle]);

  useEffect(() => {
    if (title) {
      document.title = title;
    }

    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (link) {
      link.href = icon;
    } else {
      link = document.createElement('link');
      link.rel = 'icon';
      link.href = icon;
      document.head.appendChild(link);
    }
  }, [title, icon]);

  return null;
}
