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

  // 章を足す前にブラウザへ保存された {"works":[...]} だけのデータ
  it('chapters が無い古い保存データでも、作品を失わずに章を作れる', async () => {
    const work = makeWork('w1', '古いデータの作品')
    localStorage.setItem('novel-studio:db', JSON.stringify({ works: [work] }))

    const res = await postChapter('w1', { title: '第一章' })

    expect(res.status).toBe(201)
    expect(readDb().works).toEqual([work])
    expect(readDb().chapters).toEqual([await res.json()])
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

describe('GET /api/chapters/:id', () => {
  it('章を 200 で返す(対象は 2 番目。別の作品の章が先頭にあっても)', async () => {
    const target: Chapter = {
      ...makeChapter('c2', 'w2', '開く章'),
      body: '本文です。',
    }
    seedDb({
      works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')],
      chapters: [makeChapter('c1', 'w1', '先頭の章'), target],
    })

    const res = await fetch('/api/chapters/c2')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(target)
  })

  it('存在しない id は、404 とメッセージを返す', async () => {
    seedDb({
      works: [makeWork('w1', '作品1')],
      chapters: [makeChapter('c1', 'w1', '残る章')],
    })

    const res = await fetch('/api/chapters/unknown')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '章が見つかりません' })
  })

  it('保存先が壊れた JSON でも、404 を返す', async () => {
    localStorage.setItem('novel-studio:db', '{broken')

    const res = await fetch('/api/chapters/c1')

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/chapters/:id', () => {
  it('204 を返し、章が一覧と localStorage から消える', async () => {
    const target = makeChapter('c1', 'w1', '消す章')
    seedDb({ works: [makeWork('w1', '作品1')], chapters: [target] })

    const res = await fetch('/api/chapters/c1', { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(readDb().chapters).toEqual([])
    expect(await (await fetch('/api/works/w1/chapters')).json()).toEqual([])
  })

  it('指定した章だけを消し、同じ作品の他の章・別の作品の章・作品は残す', async () => {
    const before = makeChapter('c1', 'w1', '前の章')
    const target = makeChapter('c2', 'w1', '消す章')
    const after = makeChapter('c3', 'w1', '後の章')
    const otherWorks = makeChapter('c4', 'w2', '別の作品の章')
    const works = [makeWork('w1', '作品1'), makeWork('w2', '作品2')]
    seedDb({ works, chapters: [before, target, after, otherWorks] })

    await fetch('/api/chapters/c2', { method: 'DELETE' })

    expect(readDb().chapters).toEqual([before, after, otherWorks])
    expect(readDb().works).toEqual(works)
  })

  it('存在しない id は、404 とメッセージを返し、何も変えない', async () => {
    const existing = makeChapter('c1', 'w1', '残る章')
    seedDb({ works: [makeWork('w1', '作品1')], chapters: [existing] })

    const res = await fetch('/api/chapters/unknown', { method: 'DELETE' })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '章が見つかりません' })
    expect(readDb().chapters).toEqual([existing])
  })

  it('保存先が壊れた JSON でも、404 を返す', async () => {
    localStorage.setItem('novel-studio:db', '{broken')

    const res = await fetch('/api/chapters/c1', { method: 'DELETE' })

    expect(res.status).toBe(404)
  })
})
