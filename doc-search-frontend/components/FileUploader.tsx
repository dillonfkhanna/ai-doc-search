"use client";

import React, { useRef, useState } from 'react';
// --- CHANGE: The API functions are already correct, no import changes needed ---
import { initiateUpload, fetchDocumentStatus } from '../library/api';
import { useAuth } from '../contexts/AuthContext';
import { useFileRefresh } from '../contexts/FileRefreshContext';
import { CheckCircle, AlertTriangle, X, UploadCloud } from 'lucide-react';
import SparkMD5 from 'spark-md5';

// You will need to install spark-md5:
// npm install spark-md5
// npm install -D @types/spark-md5

interface NotificationState {
  message: string;
  type: 'success' | 'error';
}

// Helper function to calculate a file's MD5 hash (No changes needed here)
const calculateFileHash = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunkSize = 2097152; // 2MB chunks
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();
    let cursor = 0;

    fileReader.onload = (e) => {
      spark.append(e.target?.result as ArrayBuffer);
      cursor += chunkSize;
      if (cursor < file.size) {
        readNextChunk();
      } else {
        resolve(spark.end());
      }
    };
    fileReader.onerror = () => reject('File hash calculation failed');
    
    const readNextChunk = () => {
      const chunk = file.slice(cursor, Math.min(cursor + chunkSize, file.size));
      fileReader.readAsArrayBuffer(chunk);
    };
    readNextChunk();
  });
};

export default function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { refreshFiles } = useFileRefresh();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploading(true);
    setNotification(null);
    // --- CHANGE: Variable to hold the doc_id for polling ---
    let docIdForPolling: number | null = null; 

    try {
      setUploadStatus("Calculating file signature...");
      const fileHash = await calculateFileHash(file);
      const token = await currentUser.getIdToken();

      setUploadStatus("Preparing secure upload...");
      const { upload_url, doc_id } = await initiateUpload(
        file.name, 
        file.type, 
        fileHash, 
        token
      );
      
      // Store the doc_id for use in the polling function
      docIdForPolling = doc_id;

      setUploadStatus(`Uploading ${file.name}...`);
      
      await fetch(upload_url, {
        method: 'PUT',
        headers: { 
          'Content-Type': file.type,
          'x-goog-meta-document-id': doc_id.toString()
        },
        body: file,
      });

      setUploadStatus('Finalizing... This may take a moment.');
      const pollForStatus = setInterval(async () => {
        // Ensure we have a doc_id before polling
        if (!docIdForPolling) {
          clearInterval(pollForStatus);
          return;
        }

        try {
          const { status } = await fetchDocumentStatus(docIdForPolling, token);

          if (status === 'COMPLETED' || status === 'FAILED') {
            clearInterval(pollForStatus);
            setIsUploading(false);
            setUploadStatus(null);
            if (status === 'COMPLETED') {
              setNotification({ message: `${file.name} successfully processed!`, type: 'success' });
              refreshFiles();
            } else {
              setNotification({ message: 'File processing failed on the backend.', type: 'error' });
            }
          }
        } catch {
            clearInterval(pollForStatus);
            setIsUploading(false);
            setUploadStatus(null);
            setNotification({ message: 'Could not verify processing status.', type: 'error' });
        }
      }, 3000); // Check status every 3 seconds

    } catch (err: unknown) {
      console.error('Upload failed', err);
      let errorMessage = "Upload failed. Please try again.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setNotification({ message: errorMessage || 'Upload failed. Please try again.', type: 'error' });
      setIsUploading(false);
      setUploadStatus(null);
    } finally {
      // Don't clear the input value immediately, to allow polling to start
      // It's cleared at the end of the success/error path
      if (inputRef.current && !isUploading) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Notification Area - No changes needed */}
      {notification && (
        <div 
          className={`flex items-center p-4 rounded-lg border text-sm ${
            notification.type === 'success' 
              ? 'bg-green-900/30 border-green-500/50 text-green-200'
              : 'bg-red-900/30 border-red-500/50 text-red-200'
          }`}
        >
          {notification.type === 'success' 
            ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            : <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
          }
          <span className="flex-1">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Uploader UI - No changes needed */}
      <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition duration-200">
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />

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
          disabled={isUploading}
        />
        <button
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 disabled:bg-blue-800 disabled:cursor-not-allowed"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Working...' : 'Choose File'}
        </button>
        {isUploading && (
          <p className="text-sm text-gray-400 mt-2 animate-pulse">{uploadStatus}</p>
        )}
      </div>
    </div>
  );
}