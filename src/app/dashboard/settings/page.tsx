'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { handleSuccess } from '@/utils/successHandler';
import { languageNames, translations } from '../../../../public/locales/translations';
import Cookies from 'js-cookie';

const formSchema = z.object({
  siteTitle: z.string().min(1),
  tagline: z.string().optional(),
  siteIcon: z.string().optional(),
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

const languages = Object.entries(languageNames).map(([code, name]) => ({
  value: code,
  label: name,
}));

const timeZones = Intl.supportedValuesOf("timeZone");

const dateFormats = [
  { label: "January 17, 2025", value: "F j, Y" },
  { label: "2025-01-17", value: "Y-m-d" },
  { label: "01/17/2025", value: "m/d/Y" },
  { label: "17/01/2025", value: "d/m/Y" },
];

const timeFormats = [
  { label: "8:21 am", value: "g:i a" },
  { label: "8:21 AM", value: "g:i A" },
  { label: "08:21", value: "H:i" },
];

export default function SettingsPage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteTitle: '',
      tagline: '',
      siteIcon: '',
      newUserRole: 'Subscriber',
      language: 'en',
      timeZone: 'UTC',
      dateFormat: 'F j, Y',
      timeFormat: 'g:i a',
    },
  });

  const [t, setT] = useState(translations.en);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations]);
  }, []);

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

    // Retrieve selected language from cookies
    const storedLanguage = Cookies.get("selectedLanguage");
    if (storedLanguage) {
      setValue('language', storedLanguage);
    }

    fetchSettingsData();
  }, [setValue]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log(values)
    const requestData = {
      ...values, // Other settings
    };

    // Update selected language and store in cookies
    Cookies.set("selectedLanguage", values.language, { expires: 7 }); // Expires in 7 days

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
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{t.profileSettings.title}</h1>
      <p className="text-gray-600 mb-8">{t.profileSettings.subtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.profileSettings.siteInformation}</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profileSettings.siteTitle}</label>
              <input
                {...register('siteTitle')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t.profileSettings.siteTitlePlaceholder}
              />
              {errors.siteTitle && <span className="text-red-500 text-sm">{errors.siteTitle.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profileSettings.tagline}</label>
              <input
                {...register('tagline')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t.profileSettings.taglinePlaceholder}
              />
              {errors.tagline && <span className="text-red-500 text-sm">{errors.tagline.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profileSettings.siteIcon}</label>
              <input
                {...register('siteIcon')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t.profileSettings.siteIconPlaceholder}
              />
              {errors.siteIcon && <span className="text-red-500 text-sm">{errors.siteIcon.message?.toString()}</span>}
            </div>
          </div>
        </div>

        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.profileSettings.adminInformation}</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profileSettings.newUserRole}</label>
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
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.profileSettings.localization}</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profileSettings.language}</label>
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
              <label className="block text-sm font-medium text-gray-700">{t.profileSettings.timeZone}</label>
              <select
                {...register('timeZone')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timeZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              {errors.timeZone && <span className="text-red-500 text-sm">{errors.timeZone.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profileSettings.dateFormat}</label>
              <select
                {...register('dateFormat')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {dateFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
              {errors.dateFormat && <span className="text-red-500 text-sm">{errors.dateFormat.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t.profileSettings.timeFormat}</label>
              <select
                {...register('timeFormat')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timeFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
              {errors.timeFormat && <span className="text-red-500 text-sm">{errors.timeFormat.message?.toString()}</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            {t.profileSettings.saveChanges}
          </button>
        </div>
      </form>
    </div>
  );
}
