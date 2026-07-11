import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
      {
        source: '/uploads/:path*',
        destination: '/public/uploads/:path*',
      },
      // Editor image uploads are written to public/upload/backgrounds at runtime.
      // Next.js won't serve files added to public/ after startup, so serve them
      // through a dynamic route instead. As an `afterFiles` rewrite this only
      // takes effect when the static file isn't served (i.e. the 404 case), so
      // the one asset that existed at boot keeps being served statically.
      {
        source: '/upload/backgrounds/:file',
        destination: '/api/editor/uploads/:file',
      },
    ];
  },
};

export default nextConfig;
