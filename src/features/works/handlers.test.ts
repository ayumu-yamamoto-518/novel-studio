import { describe, expect, it } from 'vitest'
import { writeDb } from '@/mocks/db'
import type { Work } from './types'

// setup.ts の server は mocks/handlers.ts の handlers で起動している。
// server.use で足さず、素の fetch を投げることで、
// 「server → handlers → worksHandlers」の配線そのものを確かめる。

function makeWork(id: string, title: string): Work {
  return {
    id,
    title,
    status: 'writing',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

describe('GET /api/works', () => {
  it('作品がなければ、空の配列を返す', async () => {
    const res = await fetch('/api/works')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('保存済みの作品を、新しい順(作成順の逆)で返す', async () => {
    const first = makeWork('w1', '最初の作品')
    const second = makeWork('w2', '次の作品')
    writeDb({ works: [first, second] })

    const res = await fetch('/api/works')

    expect(await res.json()).toEqual([second, first])
  })

  it('保存先が壊れた JSON でも、空の配列を返す', async () => {
    localStorage.setItem('novel-studio:db', '{broken')

    const res = await fetch('/api/works')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})
