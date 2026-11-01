import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/lib/query-client'
import { startApp } from './start-app'

function createContainer() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

afterEach(() => {
  document.body.innerHTML = ''
  // 成功した場合に App が購読した、本物の queryClient のキャッシュを持ち越さない
  queryClient.clear()
})

describe('startApp', () => {
  it('MSW の起動に成功したら、アプリを表示する', async () => {
    await startApp(createContainer(), () => Promise.resolve())

    expect(
      await screen.findByRole('heading', { name: 'novel-studio' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('MSW の起動に失敗したら、アプリの代わりにエラーを表示する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await startApp(createContainer(), () =>
      Promise.reject(new Error('Service Worker を登録できません')),
    )

    expect(
      await screen.findByRole('alert', {
        name: 'アプリを起動できませんでした',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'novel-studio' }),
    ).not.toBeInTheDocument()
  })

  it('起動に失敗したときは、原因を断定せず、再読み込みを案内する', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await startApp(createContainer(), () => Promise.reject(new Error('失敗')))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Service Worker の起動に失敗した可能性があります',
    )
    expect(alert).toHaveTextContent('再読み込み')
  })

  it('起動に失敗したときは、原因を console.error に出す', async () => {
    const error = new Error('Service Worker を登録できません')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await startApp(createContainer(), () => Promise.reject(error))

    expect(spy).toHaveBeenCalledWith(error)
  })

  it('起動の完了を待つ間は、アプリもエラーも表示しない', async () => {
    const container = createContainer()
    // 解決しない Promise を渡し、起動の途中の状態を作る。描画は非同期なので、act で流し切ってから確かめる
    await act(async () => {
      void startApp(container, () => new Promise<void>(() => {}))
    })

    expect(container).toBeEmptyDOMElement()
  })
})
