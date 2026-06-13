import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { getServerProfile } from '@/lib/supabase/server'
import { Providers } from '@/components/layout/providers/Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://landlordzs.com'),
  title: {
    default: 'LANDLORDZS — Cameroon\'s Real Estate & Construction Marketplace',
    template: '%s — LANDLORDZS',
  },
  description:
    'Buy, sell, and rent properties across Cameroon. Find contractors, architects, lawyers, and building materials all in one place.',
  keywords: [
    'real estate cameroon', 'immobilier cameroun', 'properties douala',
    'properties yaounde', 'construction cameroon', 'maisons à vendre',
  ],
  authors:  [{ name: 'LANDLORDZS' }],
  creator:  'LANDLORDZS',
  openGraph: {
    type:        'website',
    locale:      'fr_CM',
    url:         'https://landlordzs.com',
    siteName:    'LANDLORDZS',
    title:       'LANDLORDZS — Cameroon\'s Real Estate Marketplace',
    description: 'Buy, sell, rent, and build in Cameroon.',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card:  'summary_large_image',
    title: 'LANDLORDZS',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor:    '#1e40af',
  width:         'device-width',
  initialScale:  1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Pre-fetch profile server-side so AuthProvider can seed the store
  // without a client-side loading flash.
  const profile = await getServerProfile().catch(() => null)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers initialProfile={profile}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
