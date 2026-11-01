import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { seedDb } from '@/test/db'
import { renderWithClient } from '@/test/render'
import App from './App'
import type { Chapter } from '@/features/chapters/types'
import type { Work } from '@/features/works/types'

function makeWork(id: string, title: string, status: Work['status']): Work {
  return {
    id,
    title,
    status,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

function makeChapter(id: string, workId: string, title: string): Chapter {
  return {
    id,
    workId,
    title,
    body: '',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

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
    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()
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
    // 作成の経路を通さず保存先に直接用意し、削除の永続化だけを確かめる
    seedDb({
      works: [
        {
          id: 'w1',
          title: '消す作品',
          status: 'writing',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        },
      ],
    })
    const user = userEvent.setup()
    const first = renderWithClient(<App />)

    await user.click(
      await screen.findByRole('button', { name: '「消す作品」を削除' }),
    )
    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()
    first.unmount()

    renderWithClient(<App />)

    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()
  })

  it('「執筆中」「完了」のタブを表示する', () => {
    renderWithClient(<App />)

    expect(screen.getByRole('tab', { name: '執筆中' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '完了' })).toBeInTheDocument()
  })

  it('完了にした作品は、画面を開き直しても「完了」タブにある', async () => {
    // 作成の経路を通さず保存先に直接用意し、ステータス変更の永続化だけを確かめる
    seedDb({
      works: [
        {
          id: 'w1',
          title: '完了にする作品',
          status: 'writing',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        },
      ],
    })
    const user = userEvent.setup()
    const first = renderWithClient(<App />)

    await user.click(
      await screen.findByRole('button', {
        name: '「完了にする作品」を完了にする',
      }),
    )
    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()
    first.unmount()

    renderWithClient(<App />)
    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '完了' }))

    expect(await screen.findByText('完了にする作品')).toBeInTheDocument()
  })
})

describe('App の作品の画面', () => {
  // 開く作品は w2(先頭の w1 ではない)にして、固定の作品を見ていても通らないようにする
  const works = [
    makeWork('w1', 'A作品', 'writing'),
    makeWork('w2', 'B作品', 'writing'),
  ]

  it('作品名を押すと、作品の画面に切り替わり、一覧と作品の作成フォームは消える', async () => {
    seedDb({ works })
    const user = userEvent.setup()
    renderWithClient(<App />)

    await user.click(await screen.findByRole('button', { name: 'B作品' }))

    expect(
      await screen.findByRole('heading', { name: 'B作品' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('章のタイトル')).toBeInTheDocument()
    expect(screen.queryByLabelText('タイトル')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'novel-studio' }),
    ).toBeInTheDocument()
  })

  it('「作品一覧に戻る」を押すと、作品の一覧に戻る', async () => {
    seedDb({ works })
    const user = userEvent.setup()
    renderWithClient(<App />)
    await user.click(await screen.findByRole('button', { name: 'B作品' }))

    await user.click(
      await screen.findByRole('button', { name: '作品一覧に戻る' }),
    )

    expect(await screen.findByRole('button', { name: 'A作品' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'B作品' })).toBeVisible()
    expect(screen.getByLabelText('タイトル')).toBeInTheDocument()
    expect(screen.queryByLabelText('章のタイトル')).not.toBeInTheDocument()
  })

  it('「完了」タブから作品を開いて戻ると、「完了」タブのままである', async () => {
    seedDb({
      works: [
        makeWork('w1', '執筆中の作品', 'writing'),
        makeWork('w2', '完了した作品', 'completed'),
      ],
    })
    const user = userEvent.setup()
    renderWithClient(<App />)
    await user.click(screen.getByRole('tab', { name: '完了' }))
    await user.click(
      await screen.findByRole('button', { name: '完了した作品' }),
    )

    await user.click(
      await screen.findByRole('button', { name: '作品一覧に戻る' }),
    )

    expect(await screen.findByRole('tab', { name: '完了' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      await screen.findByRole('button', { name: '完了した作品' }),
    ).toBeVisible()
    expect(screen.queryByText('執筆中の作品')).not.toBeInTheDocument()
  })

  it('保存先に用意した章のうち、開いた作品の章だけを作成順で表示する', async () => {
    seedDb({
      works,
      chapters: [
        makeChapter('c1', 'w2', 'Bの第一章'),
        makeChapter('c2', 'w1', 'Aの章'),
        makeChapter('c3', 'w2', 'Bの第二章'),
      ],
    })
    const user = userEvent.setup()
    renderWithClient(<App />)

    await user.click(await screen.findByRole('button', { name: 'B作品' }))

    const items = await screen.findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Bの第一章'),
      expect.stringContaining('Bの第二章'),
    ])
    expect(screen.queryByText('Aの章')).not.toBeInTheDocument()
  })

  it('章を追加して一覧に戻り、もう一度開いても、章が残っている', async () => {
    seedDb({ works })
    const user = userEvent.setup()
    renderWithClient(<App />)
    await user.click(await screen.findByRole('button', { name: 'B作品' }))

    await user.type(await screen.findByLabelText('章のタイトル'), '第一章')
    await user.click(screen.getByRole('button', { name: '章を追加' }))
    expect(await screen.findByRole('listitem')).toHaveTextContent('第一章')
    await user.click(screen.getByRole('button', { name: '作品一覧に戻る' }))
    await user.click(await screen.findByRole('button', { name: 'B作品' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent('第一章')
  })

  it('別の作品を開き直すと、前の作品で出したエラー表示は残らない', async () => {
    seedDb({ works })
    const user = userEvent.setup()
    renderWithClient(<App />)
    await user.click(await screen.findByRole('button', { name: 'A作品' }))
    await user.click(await screen.findByRole('button', { name: '章を追加' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タイトルを入力してください',
    )
    await user.type(screen.getByLabelText('章のタイトル'), '書きかけ')

    await user.click(screen.getByRole('button', { name: '作品一覧に戻る' }))
    await user.click(await screen.findByRole('button', { name: 'B作品' }))

    expect(
      await screen.findByRole('heading', { name: 'B作品' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('章のタイトル')).toHaveValue('')
  })

  it('開いている作品が消えていたら(別のタブで削除)、「作品が見つかりません」を表示して一覧に戻れる', async () => {
    // 一覧には出ているが、開く前に保存先から消えた状況
    seedDb({ works })
    const user = userEvent.setup()
    renderWithClient(<App />)
    const button = await screen.findByRole('button', { name: 'B作品' })
    seedDb({ works: [works[0]] })

    await user.click(button)

    expect(await screen.findByText('作品が見つかりません')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '作品一覧に戻る' }))
    expect(await screen.findByRole('button', { name: 'A作品' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'B作品' }),
    ).not.toBeInTheDocument()
  })
})
