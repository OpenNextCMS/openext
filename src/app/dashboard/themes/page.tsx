'use client';
import { useState } from 'react';
import { handleSuccess } from '@/utils/successHandler';
import { Loader2 } from 'lucide-react'; // Added Loader2 import

export default function AddThemePage() {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false); // New loader state

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setIsLoading(true); // Start loader
        try {
            const res = await fetch('/api/themes/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                handleSuccess(true, null, 'Theme uploaded successfully');
            } else {
                handleSuccess(false, null, 'Failed to upload theme');
            }
        } catch {
            handleSuccess(false, null, 'Theme upload error');
        }
        setIsLoading(false); // Stop loader
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white shadow rounded-md">
            <h1 className="text-2xl font-bold mb-4 text-center">Add Theme</h1>
            <div className="mb-4">
                <input 
                    type="file" 
                    accept=".zip" 
                    onChange={handleFileChange} 
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 transition-colors"
                />
            </div>
            <button 
                onClick={handleUpload}
                disabled={isLoading} // Disable during loading
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center space-x-2"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin"/> 
                        <span>Uploading...</span>
                    </>
                ) : (
                    <span>Upload Theme</span>
                )}
            </button>
        </div>
    );
}