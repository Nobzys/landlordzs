/** @type {import('next').NextConfig} */

const SUPABASE_HOST = 'xvjjyuhximxkjirckxpo.supabase.co'

const cspDirectives = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for its runtime scripts and hydration
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind inline styles + Google Fonts stylesheet
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Supabase Storage images + data URIs for previews
  `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
  // Supabase REST, Auth, Storage, Realtime (HTTP + WebSocket)
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
  // No plugin embeds
  "object-src 'none'",
  // No foreign frames
  "frame-src 'none'",
  // Prevent base tag hijacking
  "base-uri 'self'",
  // Restrict form submissions to same origin
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  // Report-only CSP — detects violations without breaking functionality
  {
    key: 'Content-Security-Policy-Report-Only',
    value: cspDirectives,
  },
  // Prevent MIME-type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Limit referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // HSTS — enforce HTTPS for 2 years
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Disable unused browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: SUPABASE_HOST,
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
