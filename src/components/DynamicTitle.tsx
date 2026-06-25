'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const resolveSiteIcon = (siteIcon?: string) => {
  if (!siteIcon) {
    return '/img/default_site_icon.png';
  }

  if (siteIcon.startsWith('/') || siteIcon.startsWith('http')) {
    return siteIcon;
  }

  return `/siteicon/${siteIcon}`;
};

export default function DynamicTitle() {
  const [title, setTitle] = useState('Loading...');
  const [icon, setIcon] = useState('/favicon.ico');

  const pathname = usePathname();

  // Extract the last non-empty segment of the path
  const lastSegment = pathname?.split('/').filter(Boolean).pop();

  useEffect(() => {
    async function fetchSiteSettings() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        
        // Only fetch if we have a valid URL or if it's a relative path
        const res = await fetch(`${backendUrl}/api/dashboard/settings`, {
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          const data = await res.json();
          const siteTitle = data?.data?.settings?.siteTitle || 'Next.js Setup Project';
          const siteIcon = resolveSiteIcon(data?.data?.settings?.siteIcon);

          const fullTitle = lastSegment ? `${lastSegment} | ${siteTitle}` : siteTitle;
          setTitle(fullTitle);
          setIcon(siteIcon);
        } else {
          // Fallback if API fails (e.g. 500 or 404)
          setTitle(lastSegment ? `${lastSegment} | Next.js Setup Project` : 'Next.js Setup Project');
          setIcon('/favicon.ico');
        }
      } catch (error) {
        console.error('Failed to fetch site settings:', error);
        setTitle('Next.js Setup Project');
        setIcon('/favicon.ico');
      }
    }

    fetchSiteSettings();
  }, [lastSegment]);

  useEffect(() => {
    document.title = title;

    // Update favicon dynamically
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
