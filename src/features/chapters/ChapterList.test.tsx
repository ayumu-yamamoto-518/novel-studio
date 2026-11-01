import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Work } from '@/features/works/types'
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
