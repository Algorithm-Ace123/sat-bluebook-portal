/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure cookies work correctly across Vercel edge network
  experimental: {
    // Use nodejs runtime for API routes to avoid edge cookie issues
    serverComponentsExternalPackages: ['@supabase/ssr']
  },
  // Prevent aggressive caching that might hide cookie updates
  headers: async () => {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
