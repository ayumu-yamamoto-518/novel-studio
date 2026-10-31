import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/mocks/server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

// Vitest は globals 無効のため、Testing Library の自動 cleanup が効かない
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => server.close())
