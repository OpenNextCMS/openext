import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { IUser } from '@/models/User';
import { AuthService } from '@/modules/auth/authService';
import { AvatarProvider } from '@/context/AvatarContext';
import { redirect } from 'next/navigation';
import { getUserDbConnection } from '@/utils/db';  // Add this import

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
  }

  if (token) {
    try {
      const decodedToken: any = jwtDecode(token);
      const email = decodedToken.email;

      // Get the database connection
      const userDb = await getUserDbConnection();
      if (!userDb) {
        throw new Error('Failed to connect to database');
      }

      // Get the User model from the connection
      const UserModel = userDb.model<IUser>('User');
      const response = await AuthService.getUserByEmail(email, UserModel);

      if (response?.success) {
        user = {
          _id: (response.user as IUser)._id.toString(),
          username: response.user.username,
          email: response.user.email,
          siteTitle: response.user.siteTitle,
          phoneNumber: response.user.phoneNumber,
        };
      }
    } catch (error) {
      console.error('Layout error:', error);
      redirect('/login');
    }
  }

  return (
    <AvatarProvider>
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1">
          <Navbar user={user} />
          <main className="bg-gray-50 m-5 mt-[5.25rem]">
            {children}
          </main>
        </div>
      </div>
    </AvatarProvider>
  );
}