'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com'
  };


  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 ml-64">
        <Navbar user={mockUser} />
        <main className="p-8 bg-gray-50 min-h-screen mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}