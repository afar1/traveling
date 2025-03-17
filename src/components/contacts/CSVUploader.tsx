'use client';

import { useState, useCallback } from 'react';
import { parseCSV } from '@/lib/csvUtils';

interface CSVUploaderProps {
  onUploadComplete: (results: { successful: number; failed: number; errors: string[] }) => void;
  onUploadStart: () => void;
}

export default function CSVUploader({ onUploadComplete, onUploadStart }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrors(['Please upload a CSV file']);
      return;
    }

    setIsUploading(true);
    setErrors([]);
    onUploadStart();
    setUploadProgress(10);

    try {
      // Parse CSV file
      const parseResult = await parseCSV(file);
      setUploadProgress(50);
      
      if (parseResult.errors.length > 0) {
        setErrors(parseResult.errors);
        setIsUploading(false);
        return;
      }

      if (parseResult.contacts.length === 0) {
        setErrors(['No valid contacts found in CSV']);
        setIsUploading(false);
        return;
      }

      // Upload contacts to API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contacts: parseResult.contacts }),
      });

      setUploadProgress(90);

      const data = await response.json();

      if (!response.ok) {
        setErrors([data.error || 'Failed to upload contacts']);
        setIsUploading(false);
        return;
      }

      setUploadProgress(100);
      onUploadComplete(data.results);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'An unknown error occurred']);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadStart, onUploadComplete]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await processFile(files[0]);
      }
    },
    [processFile]
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <p className="mb-2 text-sm text-gray-500">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">CSV contacts file</p>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className={`mt-4 inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isUploading ? 'Uploading...' : 'Select CSV File'}
        </label>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-1 text-center">Processing contacts...</p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800">Upload Errors</h3>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 