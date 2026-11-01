import { describe, expect, it } from 'vitest'
import { readDb, writeDb } from '@/mocks/db'
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

function postWork(body: unknown) {
  return fetch('/api/works', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/works', () => {
  it('201 で、執筆中の作品を作って返す', async () => {
    const res = await postWork({ title: '吾輩は猫である' })

    expect(res.status).toBe(201)
    const work: Work = await res.json()
    expect(work).toEqual({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ),
      title: '吾輩は猫である',
      status: 'writing',
      createdAt: expect.any(String),
      updatedAt: work.createdAt,
    })
    expect(new Date(work.createdAt).toISOString()).toBe(work.createdAt)
  })

  it('作った作品が localStorage に残り、一覧(GET)に出る', async () => {
    const created: Work = await (await postWork({ title: '残る作品' })).json()

    expect(readDb().works).toEqual([created])
    const list = await (await fetch('/api/works')).json()
    expect(list).toEqual([created])
  })

  it('前後の空白(全角スペースを含む)を除いたタイトルで保存する', async () => {
    const created: Work = await (
      await postWork({ title: '　 余白のある作品 \n' })
    ).json()

    expect(created.title).toBe('余白のある作品')
  })

  it('100文字のタイトルは作れる', async () => {
    const res = await postWork({ title: 'あ'.repeat(100) })

    expect(res.status).toBe(201)
  })

  it.each([
    ['空文字', '', 'タイトルを入力してください'],
    ['空白だけ', ' 　\n ', 'タイトルを入力してください'],
    ['101文字', 'あ'.repeat(101), 'タイトルは100文字以内で入力してください'],
  ])(
    'タイトルが%sなら、400 とメッセージを返し、何も保存しない',
    async (_, title, message) => {
      const res = await postWork({ title })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ message })
      expect(readDb().works).toEqual([])
    },
  )

  it.each([
    ['JSON ではない本文', 'not json'],
    ['title がない', {}],
    ['title が文字列ではない', { title: 123 }],
    ['JSON が null', 'null'],
  ])('%sなら、400 を返し、何も保存しない', async (_, body) => {
    const res = await postWork(body)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: expect.any(String) })
    expect(readDb().works).toEqual([])
  })

  it('同時に2件作っても、両方が残り、id は異なる', async () => {
    const [a, b] = await Promise.all([
      postWork({ title: 'A' }).then((r) => r.json() as Promise<Work>),
      postWork({ title: 'B' }).then((r) => r.json() as Promise<Work>),
    ])

    expect(a.id).not.toBe(b.id)
    expect(
      readDb()
        .works.map((w) => w.title)
        .sort(),
    ).toEqual(['A', 'B'])
  })
})
