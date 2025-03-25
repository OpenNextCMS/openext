module.exports = {
  images: {
    domains: ['localhost'], // Add 'localhost' as a valid domain
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
