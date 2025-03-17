'use client';

import { useState } from 'react';
import CSVUploader from '@/components/contacts/CSVUploader';
import Link from 'next/link';

export default function UploadPage() {
  const [uploadStatus, setUploadStatus] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleUploadStart = () => {
    setUploadStatus(null);
  };

  const handleUploadComplete = (results: {
    successful: number;
    failed: number;
    errors: string[];
  }) => {
    setUploadStatus(results);
  };

  return (
    <>
      {/* Header */}
      <div className="fixed top-0 left-0 w-full z-10 bg-white/90 backdrop-blur-sm shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Traveling CRM</h1>
            </div>
            <div className="flex items-center">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Map
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="pt-20 px-4 pb-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Upload Contacts</h2>
          <p className="mt-2 text-sm text-gray-700">
            Upload your contacts CSV file to add them to the map
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">CSV Upload</h3>
          
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Required Format</h4>
            <p className="text-sm text-gray-500 mb-4">
              Your CSV file should include the following columns:
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Column
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Required
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      name
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Yes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Contact&apos;s full name
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      address
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Yes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Full address
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      company
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Yes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Company name
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      city
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Recommended
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      City name (will be extracted from address if not provided)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      latitude
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Optional
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Latitude coordinate (will be geocoded if not provided)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      longitude
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Optional
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Longitude coordinate (will be geocoded if not provided)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <a
                href="/demo_contacts.csv"
                download
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Download Sample CSV
              </a>
            </div>
          </div>

          <CSVUploader
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
          />

          {uploadStatus && (
            <div className="mt-6 p-4 border rounded-md">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Results</h3>
              <p className="text-gray-700">
                Successfully added {uploadStatus.successful} contacts.
                {uploadStatus.failed > 0 && (
                  <span className="text-red-600 ml-2">
                    Failed to add {uploadStatus.failed} contacts.
                  </span>
                )}
              </p>
              
              {uploadStatus.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-800">Errors:</h4>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {uploadStatus.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {uploadStatus.errors.length > 5 && (
                      <li>And {uploadStatus.errors.length - 5} more errors...</li>
                    )}
                  </ul>
                </div>
              )}
              
              <div className="mt-4">
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View on Map
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 