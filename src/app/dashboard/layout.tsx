import type React from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cookies } from 'next/headers';
import { AvatarProvider } from '@/context/AvatarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { redirect } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

type DashboardUser = {
  username: string;
  email: string;
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  let user: DashboardUser;
  try {
    const decoded = jwtDecode<{ email?: string; username?: string }>(token);
    if (!decoded.email || !decoded.username) {
      redirect('/login');
    }
    user = { username: decoded.username, email: decoded.email };
  } catch {
    redirect('/login');
  }

  return (
    <ThemeProvider>
      <AvatarProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar />

          <div className="flex-1">
            <Navbar user={user} />
            <main className="bg-muted/40 m-5 mt-[5.25rem]">{children}</main>
          </div>
        </div>
      </AvatarProvider>
    </ThemeProvider>
  );
}
