import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Work } from '@/features/works/types'
import { readDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { seedDb } from '@/test/db'
import { renderWithClient } from '@/test/render'
import { ChapterList } from './ChapterList'
import type { Chapter } from './types'

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

describe('ChapterList', () => {
  it('読み込み中は、その旨を表示する', () => {
    renderWithClient(<ChapterList workId="w1" />)

    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  })

  it('章が0件なら、空の状態を表示する', async () => {
    seedDb({ works: [makeWork('w1', '作品1')] })

    renderWithClient(<ChapterList workId="w1" />)

    expect(await screen.findByText('章がありません')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('その作品の章だけを、作成順で表示する', async () => {
    seedDb({
      works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')],
      chapters: [
        makeChapter('c1', 'w1', '第一章'),
        makeChapter('c2', 'w2', '別の作品の章'),
        makeChapter('c3', 'w1', '第二章'),
      ],
    })

    renderWithClient(<ChapterList workId="w1" />)

    const items = await screen.findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('第一章'),
      expect.stringContaining('第二章'),
    ])
    expect(screen.queryByText('別の作品の章')).not.toBeInTheDocument()
    expect(screen.queryByText('章がありません')).not.toBeInTheDocument()
  })

  it('読み込みに失敗したら、エラーを表示する', async () => {
    server.use(
      http.get(
        '/api/works/:workId/chapters',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )

    renderWithClient(<ChapterList workId="w1" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '章を読み込めませんでした',
    )
    expect(screen.queryByText('章がありません')).not.toBeInTheDocument()
  })
})

describe('ChapterList の削除', () => {
  const work = makeWork('w1', '作品1')

  it('削除ボタンの名前に章名が入り、複数の章が並んでも区別できる', async () => {
    seedDb({
      works: [work],
      chapters: [makeChapter('c1', 'w1', 'A'), makeChapter('c2', 'w1', 'B')],
    })

    renderWithClient(<ChapterList workId="w1" />)

    expect(
      await screen.findByRole('button', { name: '「A」を削除' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '「B」を削除' }),
    ).toBeInTheDocument()
  })

  it('「削除」を押すと、その章だけが消え、保存される(対象は中間)', async () => {
    seedDb({
      works: [work],
      chapters: [
        makeChapter('c1', 'w1', '前の章'),
        makeChapter('c2', 'w1', '消す章'),
        makeChapter('c3', 'w1', '後の章'),
      ],
    })
    const user = userEvent.setup()
    renderWithClient(<ChapterList workId="w1" />)

    await user.click(
      await screen.findByRole('button', { name: '「消す章」を削除' }),
    )

    await waitFor(() =>
      expect(screen.queryByText('消す章')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('前の章')).toBeInTheDocument()
    expect(screen.getByText('後の章')).toBeInTheDocument()
    expect(readDb().chapters.map((chapter) => chapter.title)).toEqual([
      '前の章',
      '後の章',
    ])
  })

  it('最後の1件を消すと、空の状態を表示する', async () => {
    seedDb({ works: [work], chapters: [makeChapter('c1', 'w1', '最後の章')] })
    const user = userEvent.setup()
    renderWithClient(<ChapterList workId="w1" />)

    await user.click(
      await screen.findByRole('button', { name: '「最後の章」を削除' }),
    )

    expect(await screen.findByText('章がありません')).toBeInTheDocument()
  })

  it('削除に失敗したら、エラーを表示し、章は残る', async () => {
    seedDb({
      works: [work],
      chapters: [makeChapter('c1', 'w1', '消えない章')],
    })
    server.use(
      http.delete(
        '/api/chapters/:id',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderWithClient(<ChapterList workId="w1" />)

    await user.click(
      await screen.findByRole('button', { name: '「消えない章」を削除' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '章を削除できませんでした',
    )
    expect(screen.getByText('消えない章')).toBeInTheDocument()
    expect(readDb().chapters).toHaveLength(1)
  })

  it('既に消えている章(404)は、エラーにせず、一覧から消える', async () => {
    // 別の章を残す。一覧が空になると、エラーがあっても描画されず確かめられない
    const stay = makeChapter('c2', 'w1', 'ずっと残る章')
    seedDb({
      works: [work],
      chapters: [makeChapter('c1', 'w1', '別の画面で消えた章'), stay],
    })
    const user = userEvent.setup()
    renderWithClient(<ChapterList workId="w1" />)
    const button = await screen.findByRole('button', {
      name: '「別の画面で消えた章」を削除',
    })
    // 画面の外(別のタブなど)で、先に消えた状況を作る
    seedDb({ works: [work], chapters: [stay] })

    await user.click(button)

    await waitFor(() =>
      expect(screen.queryByText('別の画面で消えた章')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('ずっと残る章')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ダブルクリックしても、エラーを出さずに消える', async () => {
    // 確かめるのは送信回数ではなく結果。2回目は 404 になるが、成功として扱う。
    // 別の章を残す理由は、上の 404 のテストと同じ
    seedDb({
      works: [work],
      chapters: [
        makeChapter('c1', 'w1', '二度押す章'),
        makeChapter('c2', 'w1', 'ずっと残る章'),
      ],
    })
    const user = userEvent.setup({ delay: null })
    renderWithClient(<ChapterList workId="w1" />)

    await user.dblClick(
      await screen.findByRole('button', { name: '「二度押す章」を削除' }),
    )

    await waitFor(() =>
      expect(screen.queryByText('二度押す章')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('ずっと残る章')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('削除している間は、すべての行の削除ボタンが無効になる', async () => {
    seedDb({
      works: [work],
      chapters: [makeChapter('c1', 'w1', 'A'), makeChapter('c2', 'w1', 'B')],
    })
    // 応答を保留にして、削除が進行中の状態を作る
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.delete('/api/chapters/:id', async () => {
        await gate
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    renderWithClient(<ChapterList workId="w1" />)

    await user.click(await screen.findByRole('button', { name: '「A」を削除' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '「B」を削除' }),
      ).toBeDisabled(),
    )
    expect(screen.getByRole('button', { name: '「A」を削除' })).toBeDisabled()

    release()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '「B」を削除' })).toBeEnabled(),
    )
  })
})
