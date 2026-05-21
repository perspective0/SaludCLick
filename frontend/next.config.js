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
};

module.exports = nextConfig;
