import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { Chapter } from '@/features/chapters/types'
import { readDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { seedDb } from '@/test/db'
import { renderWithClient } from '@/test/render'
import type { Work } from './types'
import { WorkDetail } from './WorkDetail'

function makeWork(id: string, title: string): Work {
  return {
    id,
    title,
    status: 'writing',
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

describe('WorkDetail', () => {
  it('読み込み中は、その旨を表示する', () => {
    renderWithClient(<WorkDetail workId="w1" onBack={() => {}} />)

    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  })

  it('見出しに作品名を表示する(開いた作品の名前で、先頭の作品ではない)', async () => {
    seedDb({
      works: [makeWork('w1', '別の作品'), makeWork('w2', '開いた作品')],
    })

    renderWithClient(<WorkDetail workId="w2" onBack={() => {}} />)

    expect(
      await screen.findByRole('heading', { name: '開いた作品' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '別の作品' }),
    ).not.toBeInTheDocument()
  })

  it('「戻る」を押すと、onBack が呼ばれる', async () => {
    seedDb({ works: [makeWork('w1', '作品1')] })
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderWithClient(<WorkDetail workId="w1" onBack={onBack} />)

    await user.click(
      await screen.findByRole('button', { name: '作品一覧に戻る' }),
    )

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('その作品の章だけを、作成順で表示する', async () => {
    // 開く作品は w2(固定の w1 を見ていても通ってしまわないよう、先頭の作品にしない)
    seedDb({
      works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')],
      chapters: [
        makeChapter('c1', 'w2', '第一章'),
        makeChapter('c2', 'w1', '別の作品の章'),
        makeChapter('c3', 'w2', '第二章'),
      ],
    })

    renderWithClient(<WorkDetail workId="w2" onBack={() => {}} />)

    const items = await screen.findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('第一章'),
      expect.stringContaining('第二章'),
    ])
    expect(screen.queryByText('別の作品の章')).not.toBeInTheDocument()
  })

  it('章を追加すると、開いている作品の章として保存され、一覧に出る', async () => {
    // 開く作品は w2(固定の w1 に作られていても通ってしまわないよう、先頭の作品にしない)
    seedDb({ works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')] })
    const user = userEvent.setup()
    renderWithClient(<WorkDetail workId="w2" onBack={() => {}} />)

    await user.type(await screen.findByLabelText('章のタイトル'), '第一章')
    await user.click(screen.getByRole('button', { name: '章を追加' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent('第一章')
    expect(readDb().chapters.map((chapter) => chapter.workId)).toEqual(['w2'])
  })

  describe('作品が見つからないとき(別のタブで削除された場合など)', () => {
    it('「作品が見つかりません」と戻るボタンだけを表示する(章の画面は出さない)', async () => {
      seedDb({ works: [makeWork('w1', '残る作品')] })

      renderWithClient(<WorkDetail workId="gone" onBack={() => {}} />)

      expect(
        await screen.findByText('作品が見つかりません'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '作品一覧に戻る' }),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('章のタイトル')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('戻るボタンで onBack が呼ばれる', async () => {
      const onBack = vi.fn()
      const user = userEvent.setup()
      renderWithClient(<WorkDetail workId="gone" onBack={onBack} />)

      await user.click(
        await screen.findByRole('button', { name: '作品一覧に戻る' }),
      )

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('エラー(500)のときは、「見つかりません」ではなく、読み込み失敗と戻るボタンを表示する', async () => {
      server.use(
        http.get(
          '/api/works/:id',
          () => new HttpResponse(null, { status: 500 }),
        ),
      )
      const onBack = vi.fn()
      const user = userEvent.setup()
      renderWithClient(<WorkDetail workId="w1" onBack={onBack} />)

      expect(await screen.findByRole('alert')).toHaveTextContent(
        '作品を読み込めませんでした',
      )
      expect(screen.queryByText('作品が見つかりません')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '作品一覧に戻る' }))
      expect(onBack).toHaveBeenCalledTimes(1)
    })
  })
})
