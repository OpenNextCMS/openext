// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const authService = AuthService.getInstance();

  useEffect(() => {
    if (authService.isRegistrationComplete()) {
      router.push('/login');
    } else {
      router.push('/language');
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome</h1>
        <p className="text-xl text-gray-600">Initializing your application...</p>
      </div>
    </div>
  );
}