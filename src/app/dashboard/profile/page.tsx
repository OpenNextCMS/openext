'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Globe, Mail } from "lucide-react"
import { ProfileUploader } from '@/components/ProfileUploader'

const languages = [
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Portuguese", value: "pt" },
] as const

const formSchema = z.object({
  language: z.string(),
  username: z.string().min(2).max(50),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  nickname: z.string().min(2).max(50),
  displayName: z.string().min(2).max(50),
  email: z.string().email(),
  website: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  newPassword: z.string().min(8).max(50).optional(),
})

export default function ProfilePage() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: "en",
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
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAvatarUrl(localStorage.getItem('avatarUrl'));
    }
  }, [])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        console.log('Profile saved successfully');
      } else {
        console.error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Profile Settings</h1>
      <p className="text-gray-600 mb-8">Manage your profile information and account settings</p>

      {/* Profile Picture Section */}
      <div className="mb-8 pb-8 border-b">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Picture</h2>
        <ProfileUploader 
          avatarUrl={avatarUrl}
          onUpload={(url) => setAvatarUrl(url)}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information Section */}
        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Personal Information</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
                {errors.language && <span className="text-red-500 text-sm">{errors.language.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  {...register('username')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="johndoe"
                />
                {errors.username && <span className="text-red-500 text-sm">{errors.username.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  {...register('firstName')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John"
                />
                {errors.firstName && <span className="text-red-500 text-sm">{errors.firstName.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  {...register('lastName')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Doe"
                />
                {errors.lastName && <span className="text-red-500 text-sm">{errors.lastName.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nickname <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('nickname')}
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Johnny"
                />
                {errors.nickname && <span className="text-red-500 text-sm">{errors.nickname.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Display Name</label>
                <input
                  {...register('displayName')}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
                {errors.displayName && <span className="text-red-500 text-sm">{errors.displayName.message}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="mb-8 pb-8 border-b">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Contact Information</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  {...register('email')}
                  className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  {...register('website')}
                  className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                />
              </div>
              {errors.website && <span className="text-red-500 text-sm">{errors.website.message}</span>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                {...register('bio')}
                className="w-full p-2 border rounded-md h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell us a little bit about yourself"
              />
              {errors.bio && <span className="text-red-500 text-sm">{errors.bio.message}</span>}
            </div>
          </div>
        </div>

        {/* Account Management Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Account Management</h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              {...register('newPassword')}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
            />
            <p className="text-gray-500 text-sm mt-1">
              Leave blank if you don't want to change your password
            </p>
            {errors.newPassword && <span className="text-red-500 text-sm">{errors.newPassword.message}</span>}
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
  )
}