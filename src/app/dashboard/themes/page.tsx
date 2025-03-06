'use client';
import { useState } from 'react';
import { handleSuccess } from '@/utils/successHandler';
import { Loader2, Upload } from 'lucide-react';

export default function AddThemePage() {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            setFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            setFile(e.dataTransfer.files[0]);
        }
    };
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setIsLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/themes/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                handleSuccess(true, null, 'Theme uploaded successfully');
                setFile(null); // Reset file after successful upload
            } else {
                handleSuccess(false, null, 'Failed to upload theme');
            }
        } catch {
            handleSuccess(false, null, 'Theme upload error');
        }
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-[75vh]">
            <div className="max-w-xl mx-auto p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200">
                <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">Theme Manager</h1>

                <div className="mb-8">
                    <div
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${isDragging
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : file
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-400'
                            } transition-all duration-200 ease-in-out`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <Upload className={`w-12 h-12 ${file ? 'text-green-500' : 'text-blue-500'}`} />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                    {file ? file.name : 'Upload Theme Package'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {file
                                        ? `${(file.size / 1024).toFixed(2)} KB - Ready to upload`
                                        : 'Drag and drop your .zip file here or click to browse'}
                                </p>
                            </div>

                            <input
                                type="file"
                                accept=".zip"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || isLoading}
                    className={`w-full py-4 px-6 rounded-lg shadow-md flex items-center justify-center space-x-3 text-white font-medium transition-all duration-200 ${!file
                            ? 'bg-gray-400 cursor-not-allowed'
                            : isLoading
                                ? 'bg-gray-600'
                                : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Processing Upload...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            <span>{file ? 'Upload Theme Package' : 'Select a File'}</span>
                        </>
                    )}
                </button>

                {file && (
                    <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
                        Ready to install: <span className="font-medium text-green-500">{file.name}</span>
                    </p>
                )}
            </div>
        </div>
    );
}