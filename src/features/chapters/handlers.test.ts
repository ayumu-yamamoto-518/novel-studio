import { describe, expect, it } from 'vitest'
import type { Work } from '@/features/works/types'
import { seedDb } from '@/test/db'
import type { Chapter } from './types'

// setup.ts の server は mocks/handlers.ts の handlers で起動している。
// server.use で足さず素の fetch を投げ、「server → handlers → chaptersHandlers」の配線も確かめる。

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

describe('GET /api/works/:workId/chapters', () => {
  it('その作品の章だけを、作成順(作品の一覧とは逆の古い順)で返す', async () => {
    const first = makeChapter('c1', 'w1', '第一章')
    const other = makeChapter('c2', 'w2', '別の作品の章')
    const second = makeChapter('c3', 'w1', '第二章')
    seedDb({
      works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')],
      chapters: [first, other, second],
    })

    const res = await fetch('/api/works/w1/chapters')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([first, second])
  })

  it('章がなければ、空の配列を返す', async () => {
    seedDb({
      works: [makeWork('w1', '章のない作品'), makeWork('w2', '作品2')],
      chapters: [makeChapter('c1', 'w2', '別の作品の章')],
    })

    const res = await fetch('/api/works/w1/chapters')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('存在しない作品は、404 とメッセージを返す', async () => {
    seedDb({ works: [makeWork('w1', '残る作品')] })

    const res = await fetch('/api/works/unknown/chapters')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '作品が見つかりません' })
  })

  it('作品が無いのに章だけが残っていても(取り残された章)、404 を返す', async () => {
    seedDb({ chapters: [makeChapter('c1', 'gone', '取り残された章')] })

    const res = await fetch('/api/works/gone/chapters')

    expect(res.status).toBe(404)
  })
})
