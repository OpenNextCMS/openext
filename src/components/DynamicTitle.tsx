'use client';

import { useEffect, useState } from 'react';

export default function DynamicTitle() {
  const [title, setTitle] = useState('Loading...');
  const [icon, setIcon] = useState('/favicon.ico'); // Default favicon

  useEffect(() => {
    async function fetchSiteSettings() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
        const res = await fetch(`${backendUrl}/api/dashboard/settings`);
        const data = await res.json();

        setTitle(data?.data?.settings?.siteTitle || 'Next.js Setup Project');
        setIcon(data?.data?.settings?.siteIcon || '/img/openNext.png');
      } catch (error) {
        console.error('Failed to fetch site settings:', error);
        setTitle('Next.js Setup Project');
        setIcon('/favicon.ico');
      }
    }

    fetchSiteSettings();
  }, []);

  useEffect(() => {
    document.title = title;

    // Update favicon dynamically
    const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = icon;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = icon;
      document.head.appendChild(newLink);
    }
  }, [title, icon]);

  return null;
}
