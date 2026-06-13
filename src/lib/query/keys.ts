import type { PropertyFilters } from '@/types/property'

export const queryKeys = {
  properties: {
    all:    ['properties'] as const,
    lists:  () => [...queryKeys.properties.all, 'list'] as const,
    list:   (filters: PropertyFilters) => [...queryKeys.properties.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.properties.all, 'detail', id] as const,
    search: (q: string) => [...queryKeys.properties.all, 'search', q] as const,
    my:     () => [...queryKeys.properties.all, 'my'] as const,
  },
  favorites: {
    all:  ['favorites'] as const,
    list: () => [...queryKeys.favorites.all, 'list'] as const,
    ids:  () => [...queryKeys.favorites.all, 'ids'] as const,
  },
  inquiries: {
    all:         ['inquiries'] as const,
    byProperty:  (propertyId: string) => [...queryKeys.inquiries.all, propertyId] as const,
  },
  categories: {
    all:  ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
  },
  wallet: {
    all:          ['wallet'] as const,
    balance:      () => [...queryKeys.wallet.all, 'balance'] as const,
    transactions: () => [...queryKeys.wallet.all, 'transactions'] as const,
  },
  transactions: {
    all:    ['transactions'] as const,
    list:   () => [...queryKeys.transactions.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.transactions.all, 'detail', id] as const,
    status: (id: string) => [...queryKeys.transactions.all, 'status', id] as const,
  },
  escrow: {
    all:    ['escrow'] as const,
    list:   () => [...queryKeys.escrow.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.escrow.all, 'detail', id] as const,
  },
  payouts: {
    all:  ['payouts'] as const,
    list: () => [...queryKeys.payouts.all, 'list'] as const,
  },
  commissions: {
    all:     ['commissions'] as const,
    list:    () => [...queryKeys.commissions.all, 'list'] as const,
    summary: () => [...queryKeys.commissions.all, 'summary'] as const,
  },
} as const
