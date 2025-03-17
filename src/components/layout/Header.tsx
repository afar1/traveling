'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Traveling
              </Link>
              <span className="ml-2 text-gray-500 text-sm">Internal CRM & Map</span>
            </div>
            <nav className="ml-6 flex space-x-8">
              <Link
                href="/"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300 transition"
              >
                Upload Contacts
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
} 