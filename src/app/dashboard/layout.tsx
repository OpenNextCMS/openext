import type React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cookies } from 'next/headers';
import { AvatarProvider } from '@/context/AvatarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { redirect } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { getCurrentUserFull } from '@/lib/api/user';

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

  // Mandatory first-time onboarding gate: a user who hasn't finished the setup
  // wizard is sent there before they can reach the dashboard. Only redirect on a
  // positive "not completed" signal so a transient DB error can't lock anyone out.
  const fullUser = await getCurrentUserFull();
  if (fullUser && !fullUser.onboardingCompleted) {
    redirect('/onboarding');
  }

  return (
    <ThemeProvider>
      <AvatarProvider>
        <SonnerToaster position="top-right" richColors closeButton />
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
