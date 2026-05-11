import type React from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cookies } from 'next/headers';
import { AvatarProvider } from '@/context/AvatarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { redirect } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { getUserDbConnection } from '@/utils/db';
import { IUser } from '@/models/User';

type DashboardUser = {
  username: string;
  email: string;
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  let user: DashboardUser | null = null;

  if (!token) {
    redirect('/login');
  }

  try {
    const decodedToken = jwtDecode<{ email?: string }>(token);
    if (!decodedToken.email) {
      redirect('/login');
    }

    const userDb = await getUserDbConnection();
    const UserModel = userDb.model<IUser>('User');
    const userData = await UserModel.findOne({ email: decodedToken.email });

    if (!userData?.username || !userData?.email) {
      redirect('/login');
    }

    user = {
      username: userData.username,
      email: userData.email,
    };
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
