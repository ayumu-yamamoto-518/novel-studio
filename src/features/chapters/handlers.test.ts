import { describe, expect, it } from 'vitest'
import type { Work } from '@/features/works/types'
import { readDb } from '@/mocks/db'
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

function postChapter(workId: string, body: unknown) {
  return fetch(`/api/works/${workId}/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/works/:workId/chapters', () => {
  it('201 で、本文が空の章を作って返す', async () => {
    seedDb({ works: [makeWork('w1', '作品1')] })

    const res = await postChapter('w1', { title: '第一章' })

    expect(res.status).toBe(201)
    const chapter: Chapter = await res.json()
    expect(chapter).toEqual({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ),
      workId: 'w1',
      title: '第一章',
      body: '',
      createdAt: expect.any(String),
      updatedAt: chapter.createdAt,
    })
    expect(new Date(chapter.createdAt).toISOString()).toBe(chapter.createdAt)
  })

  it('作った章が localStorage に残り、一覧の最後に加わる(既存の章は残る)', async () => {
    const existing = makeChapter('c1', 'w1', '既存の章')
    const otherWorks = makeChapter('c2', 'w2', '別の作品の章')
    seedDb({
      works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')],
      chapters: [existing, otherWorks],
    })

    const created: Chapter = await (
      await postChapter('w1', { title: '新しい章' })
    ).json()

    expect(readDb().chapters).toEqual([existing, otherWorks, created])
    expect(await (await fetch('/api/works/w1/chapters')).json()).toEqual([
      existing,
      created,
    ])
    expect(await (await fetch('/api/works/w2/chapters')).json()).toEqual([
      otherWorks,
    ])
  })

  it('指定した作品の章として作る(別の作品の章にならない)', async () => {
    seedDb({ works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')] })

    const created: Chapter = await (
      await postChapter('w2', { title: '作品2の章' })
    ).json()

    expect(created.workId).toBe('w2')
    expect(await (await fetch('/api/works/w1/chapters')).json()).toEqual([])
  })

  it('前後の空白(全角スペースを含む)を除いたタイトルで保存する', async () => {
    seedDb({ works: [makeWork('w1', '作品1')] })

    const created: Chapter = await (
      await postChapter('w1', { title: '　 余白のある章 \n' })
    ).json()

    expect(created.title).toBe('余白のある章')
  })

  it('100文字のタイトルは作れる', async () => {
    seedDb({ works: [makeWork('w1', '作品1')] })

    const res = await postChapter('w1', { title: 'あ'.repeat(100) })

    expect(res.status).toBe(201)
  })

  it.each([
    ['空文字', '', 'タイトルを入力してください'],
    ['空白だけ', ' 　\n ', 'タイトルを入力してください'],
    ['101文字', 'あ'.repeat(101), 'タイトルは100文字以内で入力してください'],
  ])(
    'タイトルが%sなら、400 とメッセージを返し、何も保存しない',
    async (_, title, message) => {
      seedDb({ works: [makeWork('w1', '作品1')] })

      const res = await postChapter('w1', { title })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ message })
      expect(readDb().chapters).toEqual([])
    },
  )

  it.each([
    ['JSON ではない本文', 'not json'],
    ['title がない', {}],
    ['title が文字列ではない', { title: 123 }],
    ['JSON が null', 'null'],
  ])('%sなら、400 を返し、何も保存しない', async (_, body) => {
    seedDb({ works: [makeWork('w1', '作品1')] })

    const res = await postChapter('w1', body)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: expect.any(String) })
    expect(readDb().chapters).toEqual([])
  })

  it('存在しない作品は、404 とメッセージを返し、何も保存しない', async () => {
    seedDb({ works: [makeWork('w1', '作品1')] })

    const res = await postChapter('unknown', { title: '第一章' })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '作品が見つかりません' })
    expect(readDb().chapters).toEqual([])
  })

  // 形・タイトルの不正は、作品の存在より先に返す(作品の PATCH と同じ順序)
  it('存在しない作品でも、タイトルが不正なら、404 より先に 400 を返す', async () => {
    const res = await postChapter('unknown', { title: '' })

    expect(res.status).toBe(400)
  })

  it('同時に2件作っても、両方が残り、id は異なる', async () => {
    seedDb({ works: [makeWork('w1', '作品1')] })

    const [a, b] = await Promise.all([
      postChapter('w1', { title: 'A' }).then(
        (r) => r.json() as Promise<Chapter>,
      ),
      postChapter('w1', { title: 'B' }).then(
        (r) => r.json() as Promise<Chapter>,
      ),
    ])

    expect(a.id).not.toBe(b.id)
    expect(
      readDb()
        .chapters.map((chapter) => chapter.title)
        .sort(),
    ).toEqual(['A', 'B'])
  })
})
