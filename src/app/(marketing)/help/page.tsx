import type { Metadata } from 'next'
import HelpContent from './HelpContent'

export const metadata: Metadata = {
  title: 'Help Center — LANDLORDZS',
  description:
    'Find answers to common questions about buying, selling, and renting properties on LANDLORDZS across Cameroon.',
}

export default function HelpPage() {
  return <HelpContent />
}
