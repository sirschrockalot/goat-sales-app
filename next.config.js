/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    // Enable for Capacitor compatibility
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
