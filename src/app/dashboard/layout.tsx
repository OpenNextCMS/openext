import type React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cookies } from 'next/headers';
import { AvatarProvider } from '@/context/AvatarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { redirect } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { getCurrentUserFull, needsOnboarding } from '@/lib/api/user';
import { ensureDefaultHomePage } from '@/services/ensureDefaultHomePage';

export const dynamic = 'force-dynamic';

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

  // SuperAdmin-only first-time onboarding. Users created by SuperAdmin skip
  // the wizard and go straight to the dashboard.
  const fullUser = await getCurrentUserFull();
  if (needsOnboarding(fullUser)) {
    redirect('/onboarding');
  }

  // Keep OpenExt default_home available whether onboarding was completed or skipped.
  if (fullUser?._id) {
    try {
      await ensureDefaultHomePage({ createdBy: String(fullUser._id) });
    } catch (err) {
      console.warn('[dashboard] ensureDefaultHomePage failed:', err);
    }
  }

  return (
    <ThemeProvider>
      <AvatarProvider>
        <SonnerToaster position="top-right" richColors closeButton />
        <div className="flex h-dvh overflow-hidden bg-background text-foreground">
          <Sidebar />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Navbar user={user} />
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-muted/40 p-5">
              {children}
            </main>
          </div>
        </div>
      </AvatarProvider>
    </ThemeProvider>
  );
}
