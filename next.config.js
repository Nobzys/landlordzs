/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xvjjyuhximxkjirckxpo.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
