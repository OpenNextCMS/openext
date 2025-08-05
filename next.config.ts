import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    domains: ['localhost'], // Allow images from localhost
  },

  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/public/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
