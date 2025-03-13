'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define the shape of the context value
interface AvatarContextType {
  avatarUrl: string | null;
  setAvatarUrl: (url: string) => void;
}

// Create Context with a default value
const AvatarContext = createContext<AvatarContextType>({
  avatarUrl: null,
  setAvatarUrl: () => {},
});

export const useAvatar = () => useContext(AvatarContext);

export const AvatarProvider = ({ children }: { children: ReactNode }) => {
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
