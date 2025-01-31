'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// Create Context
const AvatarContext = createContext({
  avatarUrl: null,
  setAvatarUrl: (url: string) => {},
});

export const useAvatar = () => useContext(AvatarContext);

export const AvatarProvider = ({ children }: { children: React.ReactNode }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Effect to fetch avatar URL from localStorage when the component mounts
  useEffect(() => {
    const savedAvatar = localStorage.getItem('avatarUrl');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  const handleSetAvatarUrl = (url: string) => {
    setAvatarUrl(url);
    localStorage.setItem('avatarUrl', url); // Save to localStorage
  };

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl: handleSetAvatarUrl }}>
      {children}
    </AvatarContext.Provider>
  );
};
