'use client';

import Body from '@/components/LanguageSelector/body';
import Marq from '@/components/LanguageSelector/marq';
import React, { useEffect } from 'react';

export default function LanguagePage() {
  useEffect(() => {
    const clearAllCookies = async () => {
      const response = await fetch('/api/clear-cookies', {
        method: 'POST',
      });
      if (!response.ok) {
        console.error('Failed to clear cookies');
      }
    };
    clearAllCookies();
  }, []);

  return (
    <div>
      <Body />
      <Marq />
    </div>
  );
}
