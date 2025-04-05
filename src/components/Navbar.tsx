'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAvatar } from '@/context/AvatarContext';
import { ThemeToggle } from './ThemeToggle';
import { handleSuccess } from '@/utils/successHandler';

export default function Navbar({ user }: { user: { username: string; email: string } | null }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { avatarUrl } = useAvatar();
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const navigateTo = (path: string) => {
    router.push(path);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Call API to remove the token
      const response = await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        handleSuccess(true, null, 'Logout Successful');
        router.push('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-background border-b shadow-sm fixed top-0 right-0 w-full z-10">
      <div className="flex items-center justify-end px-6 h-16">
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-foreground font-medium">{user?.username}</span>

          <div ref={dropdownRef} className="relative">
            {/* Avatar Circle */}
            <div
              className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' ? (
                <Image
                  src={
                    avatarUrl.startsWith('/') || avatarUrl.startsWith('http')
                      ? avatarUrl
                      : `/${avatarUrl}`
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                  width={32}
                  height={32}
                />
              ) : (
                <User className="w-5 h-5 text-primary-foreground" />
              )}
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg border z-50">
                <div className="p-4 border-b">
                  <p className="text-sm font-medium text-muted-foreground">{user?.email}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => navigateTo('/dashboard/profile')}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted"
                  >
                    <User className="w-4 h-4 text-foreground" />
                    <span className="text-foreground">Profile</span>
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:text-destructive hover:bg-destructive/30"
                  >
                    <LogOut className="w-4 h-4 text-foreground" />
                    <span className="text-foreground">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
