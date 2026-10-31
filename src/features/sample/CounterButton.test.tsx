import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CounterButton } from './CounterButton'

describe('CounterButton', () => {
  it('クリックした回数を表示する', async () => {
    const user = userEvent.setup()
    render(<CounterButton />)

    await user.click(screen.getByRole('button', { name: 'count: 0' }))
    await user.click(screen.getByRole('button', { name: 'count: 1' }))

    expect(screen.getByRole('button', { name: 'count: 2' })).toBeInTheDocument()
  })
})
