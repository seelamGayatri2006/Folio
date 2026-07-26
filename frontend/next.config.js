/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://folio-jx5t.onrender.com/api/:path*',
      },
    ];
  },
};
module.exports = nextConfig;