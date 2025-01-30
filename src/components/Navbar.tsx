'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
// import { useClickOutside } from '@/hooks/useClickOutside';

export default function Navbar({ user }: { user: { name: string; email: string } }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const router = useRouter();
  
  const handleLogout = () => {
    Cookies.remove('token', { path: '/' });
    router.push('/login');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAvatarUrl(localStorage.getItem('avatarUrl'));
    }
  }, []);

  return (
    <nav className="bg-white border-b shadow-sm fixed top-0 right-0 left-64 z-10">
      <div className="flex items-center justify-end px-6 h-16">
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium">{user?.name}</span>
          
          <div ref={dropdownRef} className="relative">
            {/* Avatar Circle */}
            <div 
              className="w-8 h-8 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm">
                  {user?.name?.charAt(0)}
                </span>
              )}
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border">
                <div className="p-4 border-b">
                  <p className="text-sm font-medium text-gray-600">{user?.email}</p>
                </div>
                
                <div className="p-2 space-y-1">
                <button 
                    onClick={() => {
                      router.push('/dashboard/profile');
                      setIsDropdownOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50"
                  >
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">Profile</span>
                  </button>
                  
                  <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">Settings</span>
                  </button>

                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">Logout</span>
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