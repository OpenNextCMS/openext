'use client';

import Body from '@/components/LanguageSelector/body';
import Marq from '@/components/LanguageSelector/marq';
import RestartPopUp from '@/components/ReusableComponents/RestartPopUp';
import React, { useEffect, useState } from 'react';

export default function LanguagePage() {
  const [needsRestart, setNeedsRestart] = useState<boolean>(false);

  useEffect(() => {
    // Moved checkRestartRequired logic here
    const restartServer = () => {
      const needsRestartEnv = process.env.NEXT_PUBLIC_needsRestart;
      const needsRestartLocal = localStorage.getItem('needsRestart');
      if (typeof window !== 'undefined') {
        if (!needsRestartEnv && needsRestartLocal === 'true') {
          setNeedsRestart(true);
        }
      }
    }
    restartServer();
  }, []);
  return (
    <div>
      {needsRestart && <RestartPopUp />}
      <Body />
      <Marq />
    </div>
  );
}
