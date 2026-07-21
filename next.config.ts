import type { NextConfig } from 'next';
import { resolveBackendBaseUrl } from './src/lib/backendUrl';

const backendBaseUrl = resolveBackendBaseUrl();

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
    // No NEXT_PUBLIC_BACKEND_URL → Next.js serves /api locally (no proxy).
    if (!backendBaseUrl) {
      return [];
    }

    const BACKEND = backendBaseUrl;

    return [
      { source: '/theme-assets/:path*', destination: `${BACKEND}/theme-assets/:path*` },
      {
        source: '/theme-engine-assets/:path*',
        destination: `${BACKEND}/theme-engine-assets/:path*`,
      },
      { source: '/plugins/:path*', destination: `${BACKEND}/plugins/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
      { source: '/upload/:path*', destination: `${BACKEND}/upload/:path*` },
      // Fallback: same-origin /api calls proxy to the external Express backend
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
    ];
  },
};

export default nextConfig;
