import type { NextConfig } from 'next';

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3012').replace(
  /\/$/,
  ''
);

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Windows: limit static-generation workers to reduce flaky child_process spawns.
  experimental: {
    cpus: 1,
  },

  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  async rewrites() {
    return [
      // Proxy backend-hosted assets so SSR/relative URLs keep working
      { source: '/theme-assets/:path*', destination: `${BACKEND}/theme-assets/:path*` },
      {
        source: '/theme-engine-assets/:path*',
        destination: `${BACKEND}/theme-engine-assets/:path*`,
      },
      { source: '/plugins/:path*', destination: `${BACKEND}/plugins/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
      { source: '/upload/:path*', destination: `${BACKEND}/upload/:path*` },
      // Fallback: any leftover same-origin /api calls proxy to the Express backend
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
    ];
  },
};

export default nextConfig;
