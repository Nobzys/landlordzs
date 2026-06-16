/** @type {import('next').NextConfig} */

const SUPABASE_HOST = 'xvjjyuhximxkjirckxpo.supabase.co'

// Content-Security-Policy — tuned for Supabase, Leaflet (unpkg CDN), and shadcn/ui (inline styles)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",                        // Next.js requires unsafe-eval in dev; tighten in prod with nonces if possible
  `style-src 'self' 'unsafe-inline' https://unpkg.com`,                     // Leaflet CSS from CDN
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://unpkg.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org`,
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,    // Supabase REST + Realtime
  "font-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  // Prevents MIME-type sniffing
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  // Blocks clickjacking
  { key: 'X-Frame-Options',           value: 'DENY' },
  // Legacy XSS filter (still useful for older browsers)
  { key: 'X-XSS-Protection',          value: '1; mode=block' },
  // Controls referrer information sent with requests
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  // Restricts access to browser features
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Forces HTTPS for 2 years, including subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Content Security Policy
  { key: 'Content-Security-Policy',   value: CSP },
]

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname:  SUPABASE_HOST,
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
