'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { handleSuccess } from '@/utils/successHandler';
import { languageNames, translations } from '../../../../public/locales/translations';
import Cookies from 'js-cookie';
import moment from 'moment-timezone';

const formSchema = z.object({
  siteTitle: z.string().min(1),
  tagline: z.string().optional(),
  siteIcon: z.string().optional(),
  language: z.string().min(2),
  timeZone: z.string().min(2),
  dateFormat: z.string().min(2),
  timeFormat: z.string().min(2),
  activeTheme: z.string().optional()
});

const languages = Object.entries(languageNames).map(([code, name]) => ({
  value: code,
  label: name,
}));

const timeZones = moment.tz.names();

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
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteTitle: '',
      tagline: '',
      siteIcon: '',
      language: 'en',
      timeZone: 'UTC',
      dateFormat: 'F j, Y',
      timeFormat: 'g:i a',
      activeTheme: ''
    },
  });
  const siteIcon = watch('siteIcon'); // watch current siteIcon value

  const [t, setT] = useState(translations.en);
  const [themes, setThemes] = useState<{ name: string; isActive: boolean }[]>([]);

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
        if (result.success && result.data.settings) {
          // Set settings data; use settings.siteTitle now
          setValue('siteTitle', result.data.settings.siteTitle || 'My Website');
          setValue('tagline', result.data.settings.tagline || '');
          setValue('siteIcon', result.data.settings.siteIcon || '');
          setValue('language', result.data.settings.language || 'en');
          setValue('timeZone', result.data.settings.timeZone || 'UTC');
          setValue('dateFormat', result.data.settings.dateFormat || 'F j, Y');
          setValue('timeFormat', result.data.settings.timeFormat || 'g:i a');
          const settingsThemes = result.data.settings.themes || [];
            const uniqueThemes: { name: string; isActive: boolean }[] = Array.from(new Set(settingsThemes.map(theme => theme.name)))
            .map(name => settingsThemes.find(theme => theme.name === name) as { name: string; isActive: boolean });
          // Sort so active theme is first if it exists
          uniqueThemes.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
          setThemes(uniqueThemes);
          if (uniqueThemes.length > 0 && uniqueThemes[0].isActive) {
            setValue('activeTheme', uniqueThemes[0].name);
          } else {
            setValue('activeTheme', '');
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

  // NEW: Handler for uploading siteIcon file
  const handleSiteIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/siteicon', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success && result.fileName) {
        setValue('siteIcon', result.fileName);
      }
    } catch (error) {
      console.error('SiteIcon upload error:', error);
    }
  };

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
        window.location.reload();
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

            {/* Replace siteIcon text input with file input and preview */}
            <div className="space-y-4">
  <label className="block text-sm font-medium text-gray-700">{t.profileSettings.siteIcon}</label>
  
  <div className="flex items-start space-x-6">
    {/* Icon Preview */}
    <div className={`relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border-2 ${siteIcon ? 'border-blue-400' : 'border-dashed border-gray-300'} flex items-center justify-center`}>
      {siteIcon ? (
        <img 
          src={`/siteicon/${siteIcon}`} 
          alt="Site Icon Preview" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-gray-400 flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium">No icon</span>
        </div>
      )}
    </div>
    
    {/* Upload Controls */}
    <div className="flex-grow space-y-3">
      <div className="relative">
        <div className="flex items-center justify-between">
          <label 
            htmlFor="site-icon-upload" 
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
            {siteIcon ? 'Change Icon' : 'Upload Icon'}
          </label>
          
          {siteIcon && (
            <button
              type="button"
              onClick={() => setValue('siteIcon', '')}
              className="ml-2 inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          )}
        </div>
        
        <input
          id="site-icon-upload"
          type="file"
          onChange={handleSiteIconChange}
          className="sr-only"
          accept="image/*"
        />
      </div>
      
      <div className="text-xs text-gray-500">
        <p>Recommended size: 512×512 pixels</p>
        <p>Supported formats: JPG, PNG, GIF (max 2MB)</p>
        
        {siteIcon && (
          <p className="mt-1 text-green-600 font-medium">
            Current file: {siteIcon}
          </p>
        )}
      </div>
    </div>
  </div>
  
  {errors.siteIcon && (
    <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded border border-red-200">
      {errors.siteIcon.message?.toString()}
    </div>
  )}
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

        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Theme Settings</h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Active Theme</label>
            <select
              {...register('activeTheme')}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {!themes.some(theme => theme.isActive) && <option value="">Select a theme</option>}
              {themes.map(theme => (
                <option key={theme.name} value={theme.name}>
                  {theme.name} {theme.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
            {errors.activeTheme && <span className="text-red-500 text-sm">{errors.activeTheme.message?.toString()}</span>}
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