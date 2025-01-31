// components/ProfileUploader.tsx
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { User } from 'lucide-react'

export function ProfileUploader({ avatarUrl, onUpload }: {
  avatarUrl: string | null
  onUpload: (url: string) => void
}) {
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        const data = await response.json()
        onUpload(data.filePath)
        localStorage.setItem('avatarUrl', data.filePath)
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setIsUploading(false)
      }
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1
  })

  return (
    <div className="flex items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
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
  )
}