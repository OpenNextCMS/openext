'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Globe, Mail } from "lucide-react";
import { ProfileUploader } from '@/components/ProfileUploader';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { handleSuccess } from '@/utils/successHandler';
import { useAvatar } from '@/context/AvatarContext';
import { translations } from '../../../../public/locales/translations';

const formSchema = z.object({
  username: z.string().min(2).max(50),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  nickname: z.string().min(2).max(50),
  displayName: z.string().min(2).max(50),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  newPassword: z.string().min(8).max(50).optional().or(z.literal(''))
});

export default function ProfilePage() {
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      nickname: "",
      displayName: "",
      email: "",
      website: "",
      bio: "",
      newPassword: "",
    },
  });
  const router = useRouter();
  const [t, setT] = useState(translations.en);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations]);
  }, []);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/profile`);
        const result = await response.json();
        
        console.log('API Response:', result); // For debugging

        if (result.success && result.data) {
          // Populate form directly with data from the user object
          setValue('username', result.data.username || '');
          setValue('email', result.data.email || '');
          setValue('firstName', result.data.firstName || '');
          setValue('lastName', result.data.lastName || '');
          setValue('nickname', result.data.nickname || '');
          setValue('displayName', result.data.displayName || '');
          setValue('website', result.data.website || '');
          setValue('bio', result.data.bio || '');
        } else {
          console.error('Failed to fetch profile data:', result.message);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserData();
  }, [setValue]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
  
      const result = await response.json();
  
      if (result.success) {
        console.log('Profile saved successfully');
        handleSuccess(true, null, 'Profile updated successfully')
        // You could add a success notification here
      } else {
        console.error('Failed to save profile:', result.message);
        // You could add an error notification here
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <div className="max-w-8xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{t.profile.title}</h1>
      <p className="text-gray-600 mb-8">{t.profile.subtitle}</p>

      {/* Profile Picture Section */}
      <div className="mb-8 pb-8 border-b">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.profile.profilePicture}</h2>
        <ProfileUploader 
          avatarUrl={avatarUrl}
          onUpload={(url) => setAvatarUrl(url)}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information Section */}
        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.profile.personalInfo}</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t.profile.username}</label>
                <input
                  {...register('username')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.profile.username}
                />
                {errors.username && <span className="text-red-500 text-sm">{errors.username.message?.toString()}</span>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t.profile.nickname}
                </label>
                <input
                  {...register('nickname')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.profile.nickname}
                />
                {errors.nickname && <span className="text-red-500 text-sm">{errors.nickname.message?.toString()}</span>}
              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t.profile.firstName}</label>
                <input
                  {...register('firstName')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.profile.firstName}
                />
                {errors.firstName && <span className="text-red-500 text-sm">{errors.firstName.message?.toString()}</span>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t.profile.lastName}</label>
                <input
                  {...register('lastName')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.profile.lastName}
                />
                {errors.lastName && <span className="text-red-500 text-sm">{errors.lastName.message?.toString()}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t.profile.displayName}</label>
                <input
                  {...register('displayName')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.profile.displayName}
                />
                {errors.displayName && <span className="text-red-500 text-sm">{errors.displayName.message?.toString()}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.profile.contactInfo}</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profile.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  {...register('email')}
                  className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.profile.email}
                />
              </div>
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profile.website}</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  {...register('website')}
                  className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t.profile.website}
                />
              </div>
              {errors.website && <span className="text-red-500 text-sm">{errors.website.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profile.bio}</label>
              <textarea
                {...register('bio')}
                className="w-full p-2 border rounded-md h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t.profile.bioPlaceholder}
              />
              {errors.bio && <span className="text-red-500 text-sm">{errors.bio.message?.toString()}</span>}
            </div>
          </div>
        </div>

        {/* Account Management Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.profile.accountManagement}</h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{t.profile.newPassword}</label>
            <input
              type="password"
              {...register('newPassword')}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t.profile.newPasswordPlaceholder}
            />
            <p className="text-gray-500 text-sm mt-1">
              {t.profile.passwordNote}
            </p>
            {errors.newPassword && <span className="text-red-500 text-sm">{errors.newPassword.message?.toString()}</span>}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            {t.profile.saveChanges}
          </button>
        </div>
      </form>
    </div>
  );
}