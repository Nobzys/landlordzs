import { QueryClient } from '@tanstack/react-query'

let client: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime:        60 * 1000,
          gcTime:           5 * 60 * 1000,
          retry:            1,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: 0,
        },
      },
    })
  }
  return client
}
