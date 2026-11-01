import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { queryClient } from './lib/query-client'

function StartupError() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <div
        role="alert"
        aria-labelledby="startup-error-title"
        className="space-y-3"
      >
        <h1 id="startup-error-title" className="text-xl font-bold">
          アプリを起動できませんでした
        </h1>
        <p className="text-sm">
          Service Worker の起動に失敗した可能性があります。このアプリは、API を
          Service Worker
          で再現しているため、起動できないと動きません。プライベートウィンドウや、Service
          Worker
          を無効にする設定のほか、通信の不調でも起きます。ページを再読み込みしても直らないときは、通常のウィンドウで開き直してください。
        </p>
      </div>
    </main>
  )
}

// startMocking が終わるまでは何も描画しない。失敗したら、アプリの代わりにエラーを表示する
export async function startApp(
  container: HTMLElement,
  startMocking: () => Promise<void>,
): Promise<void> {
  const root = createRoot(container)
  try {
    await startMocking()
  } catch (error) {
    console.error(error)
    root.render(<StartupError />)
    return
  }
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}
