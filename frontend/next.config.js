/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'saludclick.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  optimizeFonts: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:5000/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
