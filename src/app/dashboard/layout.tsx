import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cookies } from 'next/headers';
import { AvatarProvider } from '@/context/AvatarContext';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
      });

      if (response.ok) {
        const data = await response.json();
        user = data.user;
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
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Navbar user={user} />
          <main className="p-8 bg-gray-50 min-h-screen mt-16">
            {children}
          </main>
        </div>
      </div>
    </AvatarProvider>
  );
}