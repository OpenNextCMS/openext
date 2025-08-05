'use client';
import dynamic from 'next/dynamic';
import React from 'react';

interface ThemeLoaderProps {
  themeName: string;
}

const ThemeLoader: React.FC<ThemeLoaderProps> = ({ themeName }) => {
  const ThemeComponent = dynamic(() => import(`../app/themes/${themeName}/layouts/page`), {
    ssr: false,
  });
  return <ThemeComponent />;
};

export default ThemeLoader;
