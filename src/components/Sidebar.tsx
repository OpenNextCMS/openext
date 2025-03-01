'use client';

import { useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, LogOut, ChevronDown, List, PlusCircle, Palette, User, Settings } from 'lucide-react'; // Added Settings
import { useState } from 'react';
import { handleSuccess } from '@/utils/successHandler';

export default function Sidebar() {
  const [isPagesOpen, setIsPagesOpen] = useState(false);
  const [isThemesOpen, setIsThemesOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false); // NEW state for User dropdown
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Call API to remove the token
      const response = await fetch('/api/logout', { method: 'GET' });

      if (response.ok) {
        handleSuccess(true,null,'Logout Successfull')
        router.push('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="h-screen w-64 border-r bg-white fixed top-0 left-0">
      <div className="p-6 flex justify-center items-center">
        <LayoutDashboard className="mr-2 h-6 w-6" />
        <h2 
          className="text-2xl font-bold text-gray-800 cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          Dashboard
        </h2>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 space-y-2">
          {/* Pages Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsPagesOpen(!isPagesOpen)}
              className="flex items-center justify-between w-full p-3 cursor-pointer rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Pages</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isPagesOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPagesOpen && (
              <div className="ml-10 mt-1 space-y-2">
                <div className="flex items-center space-x-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  <List className="w-4 h-4" />
                  <span className="cursor-pointer">All Pages</span>
                </div>
                <div 
                  className="flex items-center space-x-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => router.push('/GrapeJSEditor')}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="cursor-pointer">Add Pages</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Themes Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsThemesOpen(!isThemesOpen)}
              className="flex items-center justify-between w-full p-3 cursor-pointer rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <Palette className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Themes</span>
              </div>
              <ChevronDown className={`w-4 h-4 transiti on-transform ${isThemesOpen ? 'rotate-180' : ''}`} />
            </button>
            {isThemesOpen && (
              <div className="ml-10 mt-1 space-y-2">
                <div 
                  className="flex items-center space-x-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => router.push('/dashboard/themes')}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="cursor-pointer">Add Themes</span>
                </div>
              </div>
            )}
          </div>
          
          {/* User Dropdown - NEW */}
          <div className="relative">
            <button 
              onClick={() => setIsUserOpen(!isUserOpen)}
              className="flex items-center justify-between w-full p-3 cursor-pointer rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">User</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isUserOpen ? 'rotate-180' : ''}`} />
            </button>
            {isUserOpen && (
              <div className="ml-10 mt-1 space-y-2">
                <div 
                  className="flex items-center space-x-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  onClick={() => router.push('/dashboard/users/addUsers')}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="cursor-pointer">Add User</span>
                </div>
                <div 
                  className="flex items-center space-x-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  onClick={() => router.push('/dashboard/users/allUsers')}
                >
                  <List className="w-4 h-4" />
                  <span className="cursor-pointer">Users</span>
                </div>
              </div>
            )}
          </div>

          {/* New Settings Button moved inside nav container */}
          <div>
            <button 
              onClick={() => router.push('/dashboard/settings')}
              className="flex w-full items-center p-3 cursor-pointer rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="ml-3 cursor-pointer text-gray-700">Settings</span>
            </button>
          </div>
          
        </div>
      </nav>

      {/* Logout Button */}
      <div className="absolute bottom-0 w-full p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center space-x-3 w-full p-3 rounded-lg hover:bg-gray-100 transition-all"
        >
          <LogOut className="w-5 h-5 text-red-600" />
          <span className="text-red-600 font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}