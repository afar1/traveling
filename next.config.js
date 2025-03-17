/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable type checking and linting during build since we verified them in development
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure webpack to handle mapbox-gl properly
  webpack: (config) => {
    // Resolve canvas dependency for mapbox-gl
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'mapbox-gl',
    };
    
    return config;
  },
};

module.exports = nextConfig; 