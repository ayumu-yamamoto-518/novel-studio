import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('アプリ名を見出しとして表示する', () => {
    renderApp()

    expect(
      screen.getByRole('heading', { name: 'novel-studio' }),
    ).toBeInTheDocument()
  })

  it('shadcn/ui のボタンを表示する', () => {
    renderApp()

    expect(
      screen.getByRole('button', { name: 'shadcn/ui' }),
    ).toBeInTheDocument()
  })

  it('MSW 経由で取得した API の状態を表示する', async () => {
    renderApp()

    expect(await screen.findByText('API: ok')).toBeInTheDocument()
  })
})
