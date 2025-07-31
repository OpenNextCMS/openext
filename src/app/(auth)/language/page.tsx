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

  useEffect(() => {
    const checkDbStatus = async () => {
      const res = await fetch('/api/env-connection?key=dbConnection');
      const data = await res.json();
      document.cookie = `dbConnection=${data.dbConnection}`;
    };

    checkDbStatus();
  }, []);

  return (
    <div>
      <Body />
      <Marq />
    </div>
  );
}
