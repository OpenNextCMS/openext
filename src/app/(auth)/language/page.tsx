'use client';

import Body from '@/components/LanguageSelector/body';
import Marq from '@/components/LanguageSelector/marq';
import React, { useEffect } from 'react';

export default function page() {
  useEffect(() => {
    // Moved checkRestartRequired logic here
    const needsRestartEnv = process.env.NEXT_PUBLIC_needsRestart;
    if (typeof window !== 'undefined') {
      const needsRestartLocal = localStorage.getItem('needsRestart');
      if (!needsRestartEnv && needsRestartLocal === 'true') {
        alert('Project restart required. Please reopen this page after restarting.');
      }
    }
  }, []);
  return (
    <div>
      <Body />
      <Marq />
    </div>
  );
}
