import { http, HttpResponse } from 'msw'
import { readDb, writeDb } from '@/mocks/db'
import { validateTitle } from './title'
import type { Work } from './types'

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

export const worksHandlers = [
  // 新しい順(作成順の逆)。createdAt の同時刻で並びがぶれないよう、挿入順を使う
  http.get('/api/works', () => {
    return HttpResponse.json([...readDb().works].reverse())
  }),

  http.post('/api/works', async ({ request }) => {
    const body = await readJson(request)
    if (
      typeof body !== 'object' ||
      body === null ||
      !('title' in body) ||
      typeof body.title !== 'string'
    ) {
      return HttpResponse.json(
        { message: 'リクエストの形式が正しくありません' },
        { status: 400 },
      )
    }

    const result = validateTitle(body.title)
    if (!result.ok) {
      return HttpResponse.json({ message: result.message }, { status: 400 })
    }

    // 同時の2回作成で片方が消えないよう、読み込みから書き込みの間に await を挟まない
    const now = new Date().toISOString()
    const work: Work = {
      id: crypto.randomUUID(),
      title: result.title,
      status: 'writing',
      createdAt: now,
      updatedAt: now,
    }
    const db = readDb()
    writeDb({ ...db, works: [...db.works, work] })

    return HttpResponse.json(work, { status: 201 })
  }),

  http.delete('/api/works/:id', ({ params }) => {
    const db = readDb()
    if (!db.works.some((work) => work.id === params.id)) {
      return HttpResponse.json(
        { message: '作品が見つかりません' },
        { status: 404 },
      )
    }

    writeDb({ ...db, works: db.works.filter((work) => work.id !== params.id) })
    return new HttpResponse(null, { status: 204 })
  }),
]
