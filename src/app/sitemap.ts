import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://landlordzs.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const adminClient = createAdminClient()

  // Static marketing pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/properties`,          lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE_URL}/professionals`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/search`,              lastModified: new Date(), changeFrequency: 'always',  priority: 0.7 },
    { url: `${BASE_URL}/register`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/login`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  // Active property listings
  let propertyRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: properties } = await (adminClient as any)
      .from('properties')
      .select('id, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(5000) as { data: { id: string; updated_at: string }[] | null }

    propertyRoutes = (properties ?? []).map((p) => ({
      url:             `${BASE_URL}/properties/${p.id}`,
      lastModified:    new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }))
  } catch {
    // Non-fatal: properties might not be accessible at build time
  }

  // Public professional profiles
  let professionalRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: professionals } = await (adminClient as any)
      .from('profiles')
      .select('role, slug, updated_at')
      .not('slug', 'is', null)
      .eq('account_status', 'active')
      .neq('role', 'admin')
      .order('updated_at', { ascending: false })
      .limit(2000) as { data: { role: string; slug: string; updated_at: string }[] | null }

    professionalRoutes = (professionals ?? []).map((p) => ({
      url:             `${BASE_URL}/professionals/${p.role}/${p.slug}`,
      lastModified:    new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority:        0.6,
    }))
  } catch {
    // Non-fatal
  }

  return [...staticRoutes, ...propertyRoutes, ...professionalRoutes]
}
