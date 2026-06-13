import { formatDistanceToNow, format } from 'date-fns'

export function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', {
    style:    'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatXAFShort(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B XAF`
  if (amount >= 1_000_000)     return `${(amount / 1_000_000).toFixed(0)}M XAF`
  if (amount >= 1_000)         return `${(amount / 1_000).toFixed(0)}K XAF`
  return `${amount} XAF`
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy')
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

export function formatArea(sqm: number): string {
  return `${sqm.toLocaleString()} m²`
}
