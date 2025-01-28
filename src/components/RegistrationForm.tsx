'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { registerSchema } from '@/modules/auth/authValidation';
import { useRouter } from 'next/navigation';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';

const RegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    // Redirect to MongoDB setup if required data is missing
    const mongodbCredentials = ['MONGODB_USERNAME', 'MONGODB_PASSWORD', 'MONGODB_CLUSTER', 'MONGODB_HOST'];
    const dbInfo = ['USER_DB_NAME', 'PAGE_DB_NAME'];
    const missingCredentials = mongodbCredentials.some((key) => !localStorage.getItem(key));
    const missingDbInfo = dbInfo.some((key) => !localStorage.getItem(key));

    if (missingCredentials || missingDbInfo) {
      router.push('/mongodb-setup'); // Redirect to setup if data is incomplete
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      siteTitle: formData.get('siteTitle') as string,
      username: formData.get('username') as string,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      phoneNo: formData.get('phoneNo') as string,
    };

    try {
      // Validate data
      registerSchema.parse(data);

      const mongodbCredentials = {
        username: localStorage.getItem('MONGODB_USERNAME'),
        password: localStorage.getItem('MONGODB_PASSWORD'),
        host: localStorage.getItem('MONGODB_HOST'),
        cluster: localStorage.getItem('MONGODB_CLUSTER'),
      };

      const userDbName = localStorage.getItem('USER_DB_NAME');
      const pageDbName = localStorage.getItem('PAGE_DB_NAME');

      const setupResponse = await fetch('/api/auth/setup-databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userDbName, pageDbName, mongodbCredentials }),
      });

      const setupData = await setupResponse.json();
      if (!setupResponse.ok) {
        throw new Error(setupData.message || 'An unexpected error occurred');
      }

      if (setupData.success) {
        // Clear localStorage before registration
        localStorage.clear();

        // Make the POST request to the API route
        const response = await fetch('/api/auth/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Registration failed');

        if (result.success) {
          handleSuccess(true, null, 'Registration successful. Redirecting to login...');
          router.push('/login'); // Redirect to login
        } else {
          throw new Error(result.message || 'Registration failed');
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else {
        handleError(error, error.message || 'An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input name="siteTitle" placeholder="Site Title" required />
      <input name="username" placeholder="Username" required />
      <input name="name" placeholder="Full Name" required />
      <input name="email" placeholder="Email" required type="email" />
      <input name="password" placeholder="Password" required type="password" />
      <input name="phoneNo" placeholder="Phone Number" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};

export default RegisterForm;
