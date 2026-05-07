import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['libreoffice-convert'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'media.licdn.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NEXT_PUBLIC_APP_URL
        ? [new URL(process.env.NEXT_PUBLIC_APP_URL).host, 'localhost:3000']
        : ['localhost:3000'],
    },
  },
}

export default nextConfig
