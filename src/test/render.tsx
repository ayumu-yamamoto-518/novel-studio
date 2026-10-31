import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

// テストでは失敗時の再試行を切り、エラー表示をすぐ確かめられるようにする
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function renderWithClient(
  ui: ReactElement,
  client: QueryClient = createTestQueryClient(),
) {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}
