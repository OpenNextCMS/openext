import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { cookies } from 'next/headers';
import {jwtDecode} from 'jwt-decode';
import mongoose from 'mongoose';
import { IUser } from '@/models/User';
import { AuthService } from '@/modules/auth/authService';
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
    // Redirect to login if token is missing
    redirect('/login');
  }

  if (token) {
    const decodedToken: any = jwtDecode(token);
    const email = decodedToken.email;
    const UserModel = mongoose.models.User || mongoose.model<IUser>('User', new mongoose.Schema({
      siteTitle: { type: String, required: true },
      username: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      phoneNumber: { type: String },
      isRegistration: { type: Boolean, default: false },
    }));
    const response = await AuthService.getUserByEmail(email, UserModel);
    if (response.success) {
      user = {
        _id: response.user._id.toString(),
        name: response.user.name,
        username: response.user.username,
        email: response.user.email,
        siteTitle: response.user.siteTitle,
        phoneNumber: response.user.phoneNumber,
      };
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