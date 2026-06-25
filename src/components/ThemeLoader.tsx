'use client';
import dynamic from 'next/dynamic';
import React from 'react';

interface ThemeLoaderProps {
  themeName: string;
}

const ThemeLoader: React.FC<ThemeLoaderProps> = ({ themeName }) => {
  // Fall back to the bundled default theme if the requested theme's files are
  // missing (e.g. a legacy/uninstalled theme name lingering in settings or a
  // stale cached get-theme response) so the home page never hard-crashes.
  const ThemeComponent = dynamic(
    () =>
      import(`../app/themes/${themeName}/layouts/page`).catch(() =>
        import(`../app/themes/openNextDefault/layouts/page`)
      ),
    { ssr: false }
  );
  return <ThemeComponent />;
};

export default ThemeLoader;
