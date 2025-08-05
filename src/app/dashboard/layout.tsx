import type React from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cookies } from 'next/headers';
import { AvatarProvider } from '@/context/AvatarContext';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  let user = null;

  if (!token) {
    redirect('/login');
    return null; // Prevent further execution
  }

  if (token) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        user = {
          username: data.user.username,
          email: data.user.email,
        };
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Layout error:', error);
      redirect('/login');
      return null; // Prevent further execution
    }
  }

  return (
    <AvatarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />

        <div className="flex-1">
          <Navbar user={user} />
          <main className="bg-muted/40 m-5 mt-[5.25rem]">{children}</main>
        </div>
      </div>
    </AvatarProvider>
  );
}
