/** @type {import('next').NextConfig} */
const nextConfig = {
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
