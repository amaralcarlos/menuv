import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Necessário para usar cookies no App Router SSR
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
