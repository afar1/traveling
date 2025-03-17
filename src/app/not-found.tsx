import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
        <p className="text-gray-600 mb-6">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
} 