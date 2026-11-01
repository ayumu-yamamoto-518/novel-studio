import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from '@/mocks/server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

// Vitest は globals 無効のため、Testing Library の自動 cleanup が効かない
afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  // vi.spyOn で差し替えたもの(window.confirm など)を、テストの途中で失敗しても必ず元に戻す
  vi.restoreAllMocks()
})

afterAll(() => server.close())
