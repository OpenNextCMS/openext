'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { handleSuccess } from '@/utils/successHandler';

const formSchema = z.object({
  siteTitle: z.string().min(1),
  tagline: z.string().optional(),
  siteIcon: z.string().optional(),
  siteAddress: z.string().url().optional().or(z.literal('')),
  adminEmail: z.string().email(),
  newUserRole: z.string().min(2),
  language: z.string().min(2),
  timeZone: z.string().min(2),
  dateFormat: z.string().min(2),
  timeFormat: z.string().min(2),
});

const userRoles = [
  { label: "Subscriber", value: "Subscriber" },
  { label: "Editor", value: "Editor" },
  { label: "Author", value: "Author" },
  { label: "Contributor", value: "Contributor" },
  { label: "Administrator", value: "Administrator" },
];

const languages = [
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
];

export default function SettingsPage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteTitle: '',
      tagline: '',
      siteIcon: '',
      siteAddress: '',
      adminEmail: '',
      newUserRole: 'Subscriber',
      language: 'en',
      timeZone: 'UTC',
      dateFormat: 'F j, Y',
      timeFormat: 'g:i a',
    },
  });

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const response = await fetch('/api/settings');
        const result = await response.json();
        console.log('API Response:', result);
        if (result.success) {
          // Set user data
          if (result.data.user) {
            setValue('siteTitle', result.data.user.siteTitle || 'My Website');
          }
          
          // Set settings data if it exists
          if (result.data.settings) {
            setValue('tagline', result.data.settings.tagline || '');
            setValue('siteIcon', result.data.settings.siteIcon || '');
            setValue('siteAddress', result.data.settings.siteAddress || '');
            setValue('adminEmail', result.data.settings.adminEmail || '');
            setValue('newUserRole', result.data.settings.newUserRole || 'Subscriber');
            setValue('language', result.data.settings.language || 'en');
            setValue('timeZone', result.data.settings.timeZone || 'UTC');
            setValue('dateFormat', result.data.settings.dateFormat || 'F j, Y');
            setValue('timeFormat', result.data.settings.timeFormat || 'g:i a');
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettingsData();
  }, [setValue]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log(values)
    const requestData = {
      ...values, // Other settings
    };
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
  
      const result = await response.json();
  
      if (result.success) {
        handleSuccess(true, null, 'Settings updated successfully');
      } else {
        console.error('Failed to save settings:', result.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="max-w-8xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Site Settings</h1>
      <p className="text-gray-600 mb-8">Manage your website's settings here</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Site Information</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Site Title</label>
              <input
                {...register('siteTitle')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Awesome Website"
              />
              {errors.siteTitle && <span className="text-red-500 text-sm">{errors.siteTitle.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Tagline</label>
              <input
                {...register('tagline')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="The best website ever"
              />
              {errors.tagline && <span className="text-red-500 text-sm">{errors.tagline.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Site Icon</label>
              <input
                {...register('siteIcon')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="icon.png"
              />
              {errors.siteIcon && <span className="text-red-500 text-sm">{errors.siteIcon.message?.toString()}</span>}
            </div>
          </div>
        </div>

        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Admin Information</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Admin Email</label>
              <input
                {...register('adminEmail')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@example.com"
              />
              {errors.adminEmail && <span className="text-red-500 text-sm">{errors.adminEmail.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">New User Role</label>
              <select
                {...register('newUserRole')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {userRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.newUserRole && <span className="text-red-500 text-sm">{errors.newUserRole.message?.toString()}</span>}
            </div>
          </div>
        </div>

        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Localization</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Language</label>
              <select
                {...register('language')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              {errors.language && <span className="text-red-500 text-sm">{errors.language.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Time Zone</label>
              <input
                {...register('timeZone')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="UTC"
              />
              {errors.timeZone && <span className="text-red-500 text-sm">{errors.timeZone.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date Format</label>
              <input
                {...register('dateFormat')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="F j, Y"
              />
              {errors.dateFormat && <span className="text-red-500 text-sm">{errors.dateFormat.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Time Format</label>
              <input
                {...register('timeFormat')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="g:i a"
              />
              {errors.timeFormat && <span className="text-red-500 text-sm">{errors.timeFormat.message?.toString()}</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
