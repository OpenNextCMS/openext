'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isRegistrationComplete = Cookies.get('isRegistrationComplete');
    
    if (isRegistrationComplete === 'true') {
      router.push('/login');
    } else {
      router.push('/language');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome</h1>
        <p className="text-xl text-gray-600">Initializing your application...</p>
      </div>
    </div>
  );
}