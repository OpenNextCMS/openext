import React from 'react';
import RegistrationForm from '@/components/RegistrationForm';

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <RegistrationForm />
    </div>
  );
};

export default RegisterPage;
