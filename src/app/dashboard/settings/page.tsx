'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { languageNames, translations } from '../../../../public/locales/translations';
import Cookies from 'js-cookie';
import moment from 'moment-timezone';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Check, Globe, Info, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/context/ThemeContext';

const formSchema = z.object({
  siteTitle: z.string().min(1, 'Site title is required'),
  tagline: z.string().optional(),
  siteIcon: z.string().optional(),
  language: z.string().min(2, 'Language is required'),
  timeZone: z.string().min(2, 'Time zone is required'),
  dateFormat: z.string().min(2, 'Date format is required'),
  timeFormat: z.string().min(2, 'Time format is required'),
  activeTheme: z.string().optional(),
  imgSize: z.string().optional(),
  enableDarkMode: z.boolean().optional(),
  revisionHistory: z.boolean().optional(), // Add this line
});

const languages = Object.entries(languageNames).map(([code, name]) => ({
  value: code,
  label: name,
}));

const timeZones = moment.tz.names();

export default function SettingsPage() {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteTitle: '',
      tagline: '',
      siteIcon: '',
      language: 'en',
      timeZone: 'UTC',
      dateFormat: 'MMMM D, YYYY',
      timeFormat: 'h:mm a',
      activeTheme: 'default',
      imgSize: '5mb',
      enableDarkMode: false,
      revisionHistory: false, // Add this line
    },
  });
  const siteIcon = watch('siteIcon');
  const { theme, setTheme } = useTheme();

  const [t, setT] = useState(translations.en);
  const [themes, setThemes] = useState<{ name: string; isActive: boolean }[]>([]);
  const [now, setNow] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations] as typeof translations.en);
  }, []);

  // Keep the "Enable Dark Mode" switch in sync with the active theme, which is
  // owned by ThemeContext (toggled from the navbar, persisted in localStorage).
  // The switch must never drive the `dark` class directly: its default value is
  // `false`, so doing so would strip dark mode on every navigation to settings.
  useEffect(() => {
    setValue('enableDarkMode', theme === 'dark');
  }, [theme, setValue]);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const fetchSettingsData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${backendUrl}/api/dashboard/settings`, {
          credentials: 'include',
        });
        const result = await response.json();
        if (result.success && result.data.settings) {
          setValue('siteTitle', result.data.settings.siteTitle || 'My Website');
          setValue('tagline', result.data.settings.tagline || '');
          setValue('siteIcon', result.data.settings.siteIcon || '');
          setValue('language', result.data.settings.language || 'en');
          setValue('timeZone', result.data.settings.timeZone || 'UTC');
          setValue('dateFormat', result.data.settings.dateFormat || 'MMMM D, YYYY');
          setValue('timeFormat', result.data.settings.timeFormat || 'h:mm a');
          // Dark mode is driven by ThemeContext/localStorage, not the stored
          // server setting — leave the switch in sync with the active theme.

          const settingsThemes = result.data.settings.themes || [];
          interface Theme {
            name: string;
            isActive: boolean;
          }
          const configArray = result.data.settings.config || [];
          const maxFileSizeSetting = configArray.find(
            (item: { key: string }) => item.key === 'maxFileSize'
          );
          if (maxFileSizeSetting) {
            setValue('imgSize', maxFileSizeSetting.value || '5mb'); // Default fallback
          }

          const uniqueThemes: Theme[] = Array.from(
            new Set(settingsThemes.map((theme: Theme) => theme.name))
          ).map((name) => settingsThemes.find((theme: Theme) => theme.name === name) as Theme);
          uniqueThemes.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
          setThemes(uniqueThemes);
          if (uniqueThemes.length > 0 && uniqueThemes[0].isActive) {
            setValue('activeTheme', uniqueThemes[0].name);
          } else {
            setValue('activeTheme', 'default');
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    const storedLanguage = Cookies.get('selectedLanguage');
    if (storedLanguage) {
      setValue('language', storedLanguage);
    }

    fetchSettingsData();
  }, [setValue]);

  const handleSiteIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${backendUrl}/api/dashboard/settings/siteicon`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success && result.fileName) {
        setValue('siteIcon', result.fileName, { shouldDirty: true });
        toast.success('Site icon uploaded successfully');
      } else {
        toast.error('Failed to upload site icon');
      }
    } catch (error) {
      console.error('SiteIcon upload error:', error);
      toast.error('Site icon upload error');
    }
  };

  const dateFormats = [
    { label: moment(now).format('MMMM D, YYYY'), value: 'MMMM D, YYYY' },
    { label: moment(now).format('YYYY-MM-DD'), value: 'YYYY-MM-DD' },
    { label: moment(now).format('MM/DD/YYYY'), value: 'MM/DD/YYYY' },
    { label: moment(now).format('DD/MM/YYYY'), value: 'DD/MM/YYYY' },
  ];

  const timeFormats = [
    { label: moment(now).format('h:mm a'), value: 'h:mm a' },
    { label: moment(now).format('h:mm A'), value: 'h:mm A' },
    { label: moment(now).format('HH:mm'), value: 'HH:mm' },
  ];

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    try {
      // Map imgSize to the correct structure for MongoDB
      interface ConfigItem {
        key: string;
        value: string;
      }

      const updatedConfig: ConfigItem[] = [{ key: 'maxFileSize', value: values.imgSize || '5mb' }];

      const updatedValues = {
        ...values,
        config: updatedConfig,
      };

      const response = await fetch(`${backendUrl}/api/dashboard/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedValues),
      });

      const result = await response.json();

      if (result.success) {
        Cookies.set('selectedLanguage', values.language, { expires: 7 });
        setShowSuccessDialog(true);
      } else {
        setErrorMessage('Failed to save settings: ' + result.message);
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage('Error saving settings');
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showSuccessDialog) {
      const timer = setTimeout(() => {
        setShowSuccessDialog(false);
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog]);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{t.profileSettings.title}</CardTitle>
            <CardDescription>{t.profileSettings.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="site-info">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="site-info">Site Information</TabsTrigger>
                <TabsTrigger value="localization">Localization</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>
              <TabsContent value="site-info" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="siteTitle">{t.profileSettings.siteTitle}</Label>
                    <Input
                      id="siteTitle"
                      {...register('siteTitle')}
                      placeholder={t.profileSettings.siteTitlePlaceholder}
                    />
                    {errors.siteTitle && (
                      <p className="text-sm text-destructive mt-1">{errors.siteTitle.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="tagline">{t.profileSettings.tagline}</Label>
                    <Input
                      id="tagline"
                      {...register('tagline')}
                      placeholder={t.profileSettings.taglinePlaceholder}
                    />
                  </div>
                  <div>
                    <Label>{t.profileSettings.siteIcon}</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="w-16 h-16 border rounded-lg overflow-hidden flex items-center justify-center bg-secondary">
                        {siteIcon ? (
                          <Image
                            src={`/siteicon/${siteIcon}`}
                            alt="Site Icon"
                            className="w-full h-full object-cover"
                            width={64}
                            height={64}
                            priority
                          />
                        ) : (
                          <Globe className="text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <Input
                          id="site-icon-upload"
                          type="file"
                          onChange={handleSiteIconChange}
                          className="my-2"
                          accept="image/*"
                        />
                        <Label
                          htmlFor="site-icon-upload"
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 cursor-pointer"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {siteIcon ? 'Change Icon' : 'Upload Icon'}
                        </Label>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Recommended size: 512×512 pixels. Supported formats: JPG, PNG, GIF (max 2MB)
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="localization" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="language">{t.profileSettings.language}</Label>
                    <Controller
                      name="language"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeZone">{t.profileSettings.timeZone}</Label>
                    <Controller
                      name="timeZone"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeZones.map((zone) => (
                              <SelectItem key={zone} value={zone}>
                                {zone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateFormat">{t.profileSettings.dateFormat}</Label>
                    <Controller
                      name="dateFormat"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select date format" />
                          </SelectTrigger>
                          <SelectContent>
                            {dateFormats.map((format) => (
                              <SelectItem key={format.value} value={format.value}>
                                {format.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeFormat">{t.profileSettings.timeFormat}</Label>
                    <Controller
                      name="timeFormat"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time format" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeFormats.map((format) => (
                              <SelectItem key={format.value} value={format.value}>
                                {format.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="appearance" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="activeTheme">Active Theme</Label>
                    <Controller
                      name="activeTheme"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a theme" />
                          </SelectTrigger>
                          <SelectContent>
                            {!themes.some((theme) => theme.isActive) && (
                              <SelectItem value="default">Select a theme</SelectItem>
                            )}
                            {themes.map((theme) => (
                              <SelectItem key={theme.name} value={theme.name}>
                                {theme.name} {theme.isActive ? '(Active)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="enableDarkMode"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            setTheme(checked ? 'dark' : 'light');
                          }}
                          id="dark-mode"
                        />
                      )}
                    />
                    <Label htmlFor="dark-mode">Enable Dark Mode</Label>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="config" className="space-y-6">
                <div className="flex items-center justify-between m-5">
                  <Label htmlFor="imgSize">Max Upload size</Label>
                  <p className="text-gray-600 dark:text-gray-200 text-sm">
                    Set the size of Image upload
                  </p>
                  <div className="flex items-center border border-gray-200 rounded bg-gray-200 dark:bg-black pr-3">
                    <Input
                      id="imgSize"
                      {...register('imgSize', {
                        setValueAs: (value) => value.replace(/\D/g, ''),
                      })}
                      className="w-9 mx-2"
                    />
                    <p className="text-gray-800 dark:text-gray-200">mb</p>
                  </div>
                </div>
                <div className="flex items-center justify-between m-5">
                  <Label htmlFor="revisionHistory">Revision History</Label>
                  <p className="text-gray-600 dark:text-gray-200 text-sm">
                    When ON, Your DB size will increase substatntly
                  </p>
                  <Controller
                    name="revisionHistory"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center gap-5">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="revisionHistory"
                        />
                        <p className={field.value ? 'text-green-500' : 'text-red-500'}>
                          {field.value ? 'ON' : 'OFF'}
                        </p>
                      </div>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <Separator className="my-4" />
          <CardFooter className="flex justify-between">
            <Alert variant="default" className="w-2/3">
              <Info className="h-4 w-4" />
              <AlertTitle>Heads up!</AlertTitle>
              <AlertDescription>
                Changing some settings may require a page reload to take effect.
              </AlertDescription>
            </Alert>
            <Button type="submit" disabled={!isDirty || isLoading}>
              {isLoading ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t.profileSettings.saveChanges}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings Updated</DialogTitle>
            <DialogDescription className="text-green-600">
              Your settings have been successfully updated.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccessDialog(false)}>Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
