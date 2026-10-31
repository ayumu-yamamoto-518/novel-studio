import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest は globals 無効のため、Testing Library の自動 cleanup が効かない
afterEach(() => {
  cleanup()
})
