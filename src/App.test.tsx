import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('アプリ名を見出しとして表示する', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'novel-studio' }),
    ).toBeInTheDocument()
  })

  it('shadcn/ui のボタンを表示する', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: 'shadcn/ui' }),
    ).toBeInTheDocument()
  })
})
