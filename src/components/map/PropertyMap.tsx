'use client'

import { useEffect, useRef } from 'react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletType = any

interface MapProperty {
  id: string
  title: string
  price: number | null
  city: string | null
  latitude: number | null
  longitude: number | null
  listing_type: string | null
  property_images?: { url: string; is_primary: boolean }[]
}

interface PropertyMapProps {
  properties: MapProperty[]
  onSelect?: (id: string) => void
}

export function PropertyMap({ properties, onSelect }: PropertyMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instanceRef = useRef<{ map: LeafletType; markers: LeafletType[] } | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Default centre: Yaoundé, Cameroon
    const defaultCenter: [number, number] = [3.848, 11.502]

    // Dynamic import to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const L = require('leaflet') as any

    // Fix default icon path issue with webpack
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    if (!instanceRef.current) {
      const map = L.map(mapRef.current, { zoomControl: true }).setView(defaultCenter, 12)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map)

      instanceRef.current = { map, markers: [] }
    }

    const { map, markers } = instanceRef.current

    // Remove old markers
    markers.forEach((m: LeafletType) => m.remove())
    instanceRef.current.markers = []

    const withCoords = properties.filter(
      (p) => p.latitude != null && p.longitude != null,
    )

    if (withCoords.length === 0) return

    const bounds: [number, number][] = []

    withCoords.forEach((p) => {
      const lat = p.latitude as number
      const lng = p.longitude as number

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:#1d4ed8;color:white;padding:4px 8px;border-radius:6px;
          font-size:11px;font-weight:700;white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;
        ">${p.price ? formatK(p.price) : (p.listing_type?.toUpperCase() ?? '?')}</div>`,
        iconAnchor: [0, 0],
      })

      const marker = L.marker([lat, lng], { icon }).addTo(map)

      const img = p.property_images?.find((i) => i.is_primary)?.url ?? p.property_images?.[0]?.url
      const popup = L.popup({ maxWidth: 200 }).setContent(`
        <div style="padding:4px">
          ${img ? `<img src="${img}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px"/>` : ''}
          <p style="font-weight:600;font-size:13px;margin:0 0 2px">${p.title}</p>
          <p style="color:#64748b;font-size:12px;margin:0">${p.city ?? ''}</p>
          <a href="/properties/${p.id}" style="display:inline-block;margin-top:6px;font-size:12px;color:#1d4ed8">View &rarr;</a>
        </div>
      `)

      marker.bindPopup(popup)
      marker.on('click', () => { onSelect?.(p.id) })

      instanceRef.current!.markers.push(marker)
      bounds.push([lat, lng])
    })

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }, [properties, onSelect])

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      instanceRef.current?.map?.remove()
      instanceRef.current = null
    }
  }, [])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-url */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={mapRef}
        className="w-full rounded-xl border overflow-hidden"
        style={{ height: 520 }}
      />
    </>
  )
}

function formatK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return n.toString()
}
