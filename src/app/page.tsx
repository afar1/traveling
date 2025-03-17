'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import with no SSR to avoid "window is not defined" errors
const ClientPage = dynamic(() => import('@/components/pages/HomePage'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-gray-600">Loading Traveling CRM...</div>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Loading Traveling CRM...</div>
        </div>
      </div>
    }>
      <ClientPage />
    </Suspense>
  );
}
