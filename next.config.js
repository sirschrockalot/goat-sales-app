import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  webpack: (config) => {
    // Ensure proper module resolution for @ alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
}

export default nextConfig
