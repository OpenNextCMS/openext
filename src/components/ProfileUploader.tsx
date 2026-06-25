// components/ProfileUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { safeStorageSet } from '@/utils/safeStorage';

const getAvatarSrc = (avatarUrl: string | null) => {
  if (!avatarUrl || avatarUrl === 'null' || avatarUrl === 'undefined') {
    return null;
  }

  return avatarUrl.startsWith('/') || avatarUrl.startsWith('http')
    ? avatarUrl
    : `/${avatarUrl}`;
};

export function ProfileUploader({
  avatarUrl,
  onUpload,
  userId,
}: {
  avatarUrl: string | null;
  onUpload: (url: string | null) => void;
  userId: string; // Add userId as a prop
}) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId); // Include userId in the form data

        try {
          const response = await fetch('/api/dashboard/profile/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          onUpload(data.filePath);
          safeStorageSet('avatarUrl', data.filePath);
          toast.success('Profile image uploaded successfully!');
        } catch (error) {
          console.error('Upload failed:', error);
          toast.error('Failed to upload profile image.');
        } finally {
          setIsUploading(false);
        }
      }
    },
    [onUpload, userId]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxFiles: 1,
  });

  const avatarSrc = getAvatarSrc(avatarUrl);

  return (
    <div className="flex items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt="Profile"
            className="w-full h-full object-cover"
            width={96}
            height={96}
          />
        ) : (
          <User className="w-12 h-12 text-gray-500" />
        )}
      </div>
      <div>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <button
            type="button"
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Change Picture'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Recommended: Square JPG, PNG, or GIF, at least 400x400 pixels.
        </p>
      </div>
    </div>
  );
}
