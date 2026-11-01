import { describe, expect, it } from 'vitest'
import { readDb } from '@/mocks/db'
import { seedDb } from '@/test/db'
import type { Work } from './types'

// setup.ts の server は mocks/handlers.ts の handlers で起動している。
// server.use で足さず、素の fetch を投げることで、
// 「server → handlers → worksHandlers」の配線そのものを確かめる。

function makeWork(
  id: string,
  title: string,
  status: Work['status'] = 'writing',
): Work {
  return {
    id,
    title,
    status,
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
    seedDb({ works: [first, second] })

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

describe('GET /api/works/:id', () => {
  it('作品を 200 で返す', async () => {
    const target = makeWork('w1', '対象の作品')
    // 対象を先頭に置くと、id を見ずに先頭を返す実装でも通ってしまう
    seedDb({ works: [makeWork('w2', '他の作品'), target] })

    const res = await fetch('/api/works/w1')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(target)
  })

  it('存在しない id は 404 とメッセージを返す', async () => {
    seedDb({ works: [makeWork('w1', '残る作品')] })

    const res = await fetch('/api/works/unknown')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '作品が見つかりません' })
  })

  it('保存先が壊れた JSON でも、404 を返す', async () => {
    localStorage.setItem('novel-studio:db', '{broken')

    const res = await fetch('/api/works/w1')

    expect(res.status).toBe(404)
  })
})

describe('GET /api/works?status=', () => {
  const writing1 = makeWork('w1', '執筆中1', 'writing')
  const completed1 = makeWork('w2', '完了1', 'completed')
  const writing2 = makeWork('w3', '執筆中2', 'writing')
  const completed2 = makeWork('w4', '完了2', 'completed')

  it('writing を指定すると、執筆中の作品だけを新しい順で返す', async () => {
    seedDb({ works: [writing1, completed1, writing2, completed2] })

    const res = await fetch('/api/works?status=writing')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([writing2, writing1])
  })

  it('completed を指定すると、完了の作品だけを新しい順で返す', async () => {
    seedDb({ works: [writing1, completed1, writing2, completed2] })

    const res = await fetch('/api/works?status=completed')

    expect(await res.json()).toEqual([completed2, completed1])
  })

  it('指定した状態の作品がなければ、空の配列を返す', async () => {
    seedDb({ works: [writing1] })

    const res = await fetch('/api/works?status=completed')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('status を省略すると、全件を新しい順で返す', async () => {
    seedDb({ works: [writing1, completed1] })

    const res = await fetch('/api/works')

    expect(await res.json()).toEqual([completed1, writing1])
  })

  it.each(['archived', '', 'WRITING'])(
    '不正な status(%j)は、400 とメッセージを返す',
    async (status) => {
      seedDb({ works: [writing1] })

      const res = await fetch(`/api/works?status=${status}`)

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ message: expect.any(String) })
    },
  )
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

describe('DELETE /api/works/:id', () => {
  it('204 を返し、作品が一覧と localStorage から消える', async () => {
    const target = makeWork('w1', '消す作品')
    seedDb({ works: [target] })

    const res = await fetch('/api/works/w1', { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(readDb().works).toEqual([])
    expect(await (await fetch('/api/works')).json()).toEqual([])
  })

  it('指定した作品だけを消し、他の作品は残す', async () => {
    const keep1 = makeWork('w1', '残る作品1')
    const target = makeWork('w2', '消す作品')
    const keep2 = makeWork('w3', '残る作品2')
    seedDb({ works: [keep1, target, keep2] })

    await fetch('/api/works/w2', { method: 'DELETE' })

    expect(readDb().works).toEqual([keep1, keep2])
  })

  it('存在しない id は 404 とメッセージを返し、何も変えない', async () => {
    const existing = makeWork('w1', '残る作品')
    seedDb({ works: [existing] })

    const res = await fetch('/api/works/unknown', { method: 'DELETE' })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '作品が見つかりません' })
    expect(readDb().works).toEqual([existing])
  })

  it('保存先が壊れた JSON でも、404 を返す', async () => {
    localStorage.setItem('novel-studio:db', '{broken')

    const res = await fetch('/api/works/w1', { method: 'DELETE' })

    expect(res.status).toBe(404)
  })
})

function patchWork(id: string, body: unknown) {
  return fetch(`/api/works/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('PATCH /api/works/:id', () => {
  // updatedAt が進むことを確かめるため、作成日時は十分に昔にする
  const old = '2020-01-01T00:00:00.000Z'
  const target: Work = {
    ...makeWork('w1', '対象の作品'),
    createdAt: old,
    updatedAt: old,
  }

  it('ステータスを変えて 200 で更新後の作品を返し、updatedAt だけが進む', async () => {
    seedDb({ works: [target] })

    const res = await patchWork('w1', { status: 'completed' })

    expect(res.status).toBe(200)
    const updated: Work = await res.json()
    expect(updated).toEqual({
      ...target,
      status: 'completed',
      updatedAt: expect.any(String),
    })
    expect(updated.createdAt).toBe(old)
    expect(new Date(updated.updatedAt).toISOString()).toBe(updated.updatedAt)
    expect(updated.updatedAt > old).toBe(true)
  })

  it('変更が localStorage に残り、status での絞り込みに反映される', async () => {
    seedDb({ works: [target] })

    await patchWork('w1', { status: 'completed' })

    expect(readDb().works.map((work) => work.status)).toEqual(['completed'])
    expect(await (await fetch('/api/works?status=writing')).json()).toEqual([])
    expect(
      (await (await fetch('/api/works?status=completed')).json()).map(
        (work: Work) => work.id,
      ),
    ).toEqual(['w1'])
  })

  it('完了から執筆中に戻せる', async () => {
    seedDb({ works: [{ ...target, status: 'completed' }] })

    const res = await patchWork('w1', { status: 'writing' })

    expect((await res.json()).status).toBe('writing')
    expect(readDb().works[0].status).toBe('writing')
  })

  it('指定した作品だけを変え、他の作品は変えない', async () => {
    const other = makeWork('w2', '他の作品')
    seedDb({ works: [target, other] })

    await patchWork('w1', { status: 'completed' })

    expect(readDb().works[1]).toEqual(other)
  })

  it('存在しない id は 404 とメッセージを返し、何も変えない', async () => {
    seedDb({ works: [target] })

    const res = await patchWork('unknown', { status: 'completed' })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: '作品が見つかりません' })
    expect(readDb().works).toEqual([target])
  })

  it.each([
    ['status が不正な値', { status: 'archived' }],
    ['status がない', {}],
    ['status が文字列ではない', { status: 1 }],
    ['JSON ではない本文', 'not json'],
    ['JSON が null', 'null'],
  ])('%sなら、400 を返し、何も変えない', async (_, body) => {
    seedDb({ works: [target] })

    const res = await patchWork('w1', body)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: expect.any(String) })
    expect(readDb().works).toEqual([target])
  })
})
