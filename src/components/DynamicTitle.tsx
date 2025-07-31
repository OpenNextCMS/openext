'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function DynamicTitle() {
  const [title, setTitle] = useState('Loading...');
  const [icon, setIcon] = useState('/favicon.ico');

  const pathname = usePathname();

  // Extract the last non-empty segment of the path
  const lastSegment = pathname?.split('/').filter(Boolean).pop();

  useEffect(() => {
    console.log('Last URL segment:', lastSegment);

    async function fetchSiteSettings() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
        const res = await fetch(`${backendUrl}/api/dashboard/settings`);
        const data = await res.json();

        const siteTitle = data?.data?.settings?.siteTitle || 'Next.js Setup Project';
        const siteIcon = data?.data?.settings?.siteIcon || '/img/default_site_icon.png';

        const fullTitle = lastSegment ? `${lastSegment} | ${siteTitle}` : siteTitle;
        setTitle(fullTitle);
        setIcon(siteIcon);
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
