'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Globe, Mail, User, Pencil, Key } from 'lucide-react';
import { ProfileUploader } from '@/components/ProfileUploader';
import Cookies from 'js-cookie';
import { useAvatar } from '@/context/AvatarContext';
import { translations } from '../../../../public/locales/translations';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be at most 50 characters'),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters'),
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(50, 'Nickname must be at most 50 characters'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be at most 50 characters'),
  email: z.string().email('Invalid email address'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional().or(z.literal('')),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(50, 'Password must be at most 50 characters')
    .optional()
    .or(z.literal('')),
});

export default function ProfilePage() {
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const [userId, setUserId] = useState<string>(''); // Add state for userId
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      nickname: '',
      displayName: '',
      email: '',
      website: '',
      bio: '',
      newPassword: '',
    },
  });
  const [t, setT] = useState(translations.en);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const langFromCookie = Cookies.get('selectedLanguage') || 'en';
    setT(translations[langFromCookie as keyof typeof translations] as typeof translations.en);
  }, []);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${backendUrl}/api/dashboard/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        const result = await response.json();

        if (result.success && result.data) {
          setUserId(result.data._id); // Set the userId from the response
          setAvatarUrl(result.data.profilePicturePath || null); // Set the avatarUrl from the database
          Object.keys(result.data).forEach((key) => {
            if (key in formSchema.shape) {
              setValue(key as keyof z.infer<typeof formSchema>, result.data[key] || '');
            }
          });

          // Default the display name to the email's local part (before "@")
          // when the user hasn't set one yet. It stays fully editable.
          const existingDisplayName = (result.data.displayName || '').trim();
          const email = (result.data.email || '').trim();
          if (!existingDisplayName && email.includes('@')) {
            setValue('displayName', email.split('@')[0]);
          }
        } else {
          toast.error('Failed to fetch profile data: ' + result.message);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Error fetching profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [setValue, backendUrl, setAvatarUrl]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/dashboard/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Profile updated successfully');
        // Optionally refresh data or update state here instead of full page reload
      } else {
        toast.error('Failed to save profile: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error saving profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{t.profile.title}</CardTitle>
          <CardDescription>{t.profile.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profilePicture">{t.profile.profilePicture}</Label>
                  <ProfileUploader
                    avatarUrl={avatarUrl}
                    onUpload={(url) => setAvatarUrl(url)}
                    userId={userId}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t.profile.username}</Label>
                    <Input
                      id="username"
                      {...register('username')}
                      placeholder={t.profile.username}
                    />
                    {errors.username && (
                      <p className="text-sm text-destructive">{errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nickname">{t.profile.nickname}</Label>
                    <Input
                      id="nickname"
                      {...register('nickname')}
                      placeholder={t.profile.nickname}
                    />
                    {errors.nickname && (
                      <p className="text-sm text-destructive">{errors.nickname.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t.profile.firstName}</Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      placeholder={t.profile.firstName}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.profile.lastName}</Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      placeholder={t.profile.lastName}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t.profile.displayName}</Label>
                  <Input
                    id="displayName"
                    {...register('displayName')}
                    placeholder={t.profile.displayName}
                  />
                  {errors.displayName && (
                    <p className="text-sm text-destructive">{errors.displayName.message}</p>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contact" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.profile.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      {...register('email')}
                      className="pl-10"
                      placeholder={t.profile.email}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t.profile.website}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      {...register('website')}
                      className="pl-10"
                      placeholder={t.profile.website}
                    />
                  </div>
                  {errors.website && (
                    <p className="text-sm text-destructive">{errors.website.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">{t.profile.bio}</Label>
                  <Textarea
                    id="bio"
                    {...register('bio')}
                    placeholder={t.profile.bioPlaceholder}
                    className="h-32"
                  />
                  {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="account" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t.profile.newPassword}</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      {...register('newPassword')}
                      className="pl-10"
                      placeholder={t.profile.newPasswordPlaceholder}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{t.profile.passwordNote}</p>
                  {errors.newPassword && (
                    <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <Separator className="my-4" />
        <CardFooter className="flex justify-between">
          <Alert variant="default" className="w-2/3">
            <User className="h-4 w-4" />
            <AlertTitle>Profile Update</AlertTitle>
            <AlertDescription>
              Your changes will be reflected immediately after saving.
            </AlertDescription>
          </Alert>
          <Button type="submit" disabled={!isDirty || isLoading}>
            {isLoading ? (
              <>
                <Pencil className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                {t.profile.saveChanges}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
