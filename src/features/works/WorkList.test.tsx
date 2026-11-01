import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { writeDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { renderWithClient } from '@/test/render'
import type { Work } from './types'
import { WorkList } from './WorkList'

function makeWork(id: string, title: string): Work {
  return {
    id,
    title,
    status: 'writing',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

describe('WorkList', () => {
  it('読み込み中は、その旨を表示する', () => {
    renderWithClient(<WorkList />)

    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  })

  it('作品が0件なら、空の状態を表示する', async () => {
    renderWithClient(<WorkList />)

    expect(await screen.findByText('作品がありません')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('作品のタイトルを、新しい順に表示する', async () => {
    writeDb({
      works: [makeWork('w1', '古い作品'), makeWork('w2', '新しい作品')],
    })

    renderWithClient(<WorkList />)

    const items = await screen.findAllByRole('listitem')
    expect(
      items.map((item) => within(item).getByText(/作品/).textContent),
    ).toEqual(['新しい作品', '古い作品'])
    expect(screen.queryByText('作品がありません')).not.toBeInTheDocument()
  })

  it('読み込みに失敗したら、エラーを表示する', async () => {
    server.use(
      http.get('/api/works', () => new HttpResponse(null, { status: 500 })),
    )

    renderWithClient(<WorkList />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '作品を読み込めませんでした',
    )
    expect(screen.queryByText('作品がありません')).not.toBeInTheDocument()
  })
})
