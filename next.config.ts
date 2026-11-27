import type { NextConfig } from 'next';
import { resolveBackendBaseUrl } from './src/lib/backendUrl';

const backendBaseUrl = resolveBackendBaseUrl();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Windows: limit static-generation workers to reduce flaky child_process spawns.
  experimental: {
    cpus: 1,
  },

  // Next.js 16 default bundler. Webpack ignoreWarnings are not needed under Turbopack.
  turbopack: {},

  // Plugin backend loader reads uploaded files from src/app/api/plugins/[pluginId] at runtime.
  serverExternalPackages: ['mongoose'],

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
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
    // Runtime uploads land in public/upload/backgrounds AFTER the server starts.
    // Next static serving often 404s those files — always route them through the
    // on-disk API handler so Theme Engine / editor image fields render immediately.
    const localUploadRewrites = [
      {
        source: '/upload/backgrounds/:file',
        destination: '/api/editor/uploads/:file',
      },
    ];

    // No NEXT_PUBLIC_BACKEND_URL → Next.js serves /api locally (no proxy).
    if (!backendBaseUrl) {
      return localUploadRewrites;
    }

    const BACKEND = backendBaseUrl;

    return [
      ...localUploadRewrites,
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
