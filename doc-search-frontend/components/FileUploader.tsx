// src/components/FileUploader.tsx
'use client';

import React, { useRef, useState } from 'react';
import { getSignedUrl } from '../library/api';
import { useAuth } from '../contexts/AuthContext';
import { useFileRefresh } from '../contexts/FileRefreshContext';

export default function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { currentUser } = useAuth();
  const { refreshFiles } = useFileRefresh();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const token = await currentUser.getIdToken();
      const signedUrl = await getSignedUrl(file.name, file.type,token);

      await fetch(signedUrl.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      alert('Upload successful!');
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed. Check console.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = ''; // Reset file input
      refreshFiles();
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition duration-200">
      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <p className="text-gray-400 mb-2">
        <span className="font-medium text-white">Click to upload</span> or drag and drop
      </p>
      <p className="text-sm text-gray-500">PDF, DOC, DOCX, TXT up to 10MB</p>

      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
      />
      <button
        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Choose File'}
      </button>
    </div>
  );
}