'use client';

import { useEffect, useState } from 'react';
import { socialMediaApi } from './api';

export function useSocialMediaStatus() {
  const [loading, setLoading] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [version, setVersion] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    socialMediaApi
      .status()
      .then((s) => {
        if (!active) return;
        setInstalled(s.installed);
        setEnabled(s.enabled);
        setVersion(s.version);
      })
      .catch(() => {
        if (!active) return;
        setInstalled(false);
        setEnabled(false);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { loading, installed, enabled, version };
}
