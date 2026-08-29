'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'
import type { CartItemData } from '@/components/marketplace/CartItem'

async function fetchCartItems(): Promise<CartItemData[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('cart_items')
    .select(`
      id, quantity,
      products:product_id (
        id, name, price, unit, stock_qty,
        product_images(url, is_primary, sort_order),
        vendor_profiles:vendor_id(store_name, store_slug)
      )
    `)
    .order('created_at', { ascending: false }) as { data: CartItemData[] | null }
  return data ?? []
}

export function useCart() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  return useQuery({
    queryKey: queryKeys.cart.items(),
    queryFn:  fetchCartItems,
    enabled:  isAuthenticated,
    staleTime: 30 * 1000,
  })
}

export function useCartCount() {
  const { data } = useCart()
  return data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}
