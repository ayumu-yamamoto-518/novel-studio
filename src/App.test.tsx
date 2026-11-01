import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithClient } from '@/test/render'
import App from './App'

describe('App', () => {
  it('アプリ名を見出しとして表示する', () => {
    renderWithClient(<App />)

    expect(
      screen.getByRole('heading', { name: 'novel-studio' }),
    ).toBeInTheDocument()
  })

  it('作成フォームと、作品の一覧(0件なら空の状態)を表示する', async () => {
    renderWithClient(<App />)

    expect(screen.getByLabelText('タイトル')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '作成' })).toBeInTheDocument()
    expect(await screen.findByText('作品がありません')).toBeInTheDocument()
  })

  it('作った作品は、画面を開き直しても(別のキャッシュでも)表示される', async () => {
    const user = userEvent.setup()
    const first = renderWithClient(<App />)

    await user.type(screen.getByLabelText('タイトル'), '残る作品')
    await user.click(screen.getByRole('button', { name: '作成' }))
    expect(await screen.findByRole('listitem')).toHaveTextContent('残る作品')
    first.unmount()

    renderWithClient(<App />)

    expect(await screen.findByRole('listitem')).toHaveTextContent('残る作品')
  })

  it('削除した作品は、画面を開き直しても消えたままである', async () => {
    const user = userEvent.setup()
    const first = renderWithClient(<App />)

    await user.type(screen.getByLabelText('タイトル'), '消す作品')
    await user.click(screen.getByRole('button', { name: '作成' }))
    await user.click(
      await screen.findByRole('button', { name: '「消す作品」を削除' }),
    )
    expect(await screen.findByText('作品がありません')).toBeInTheDocument()
    first.unmount()

    renderWithClient(<App />)

    expect(await screen.findByText('作品がありません')).toBeInTheDocument()
  })
})
