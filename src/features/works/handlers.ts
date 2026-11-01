import { http, HttpResponse } from 'msw'
import { readDb, writeDb } from '@/mocks/db'
import { validateTitle } from '@/lib/title'
import type { Work, WorkStatus } from './types'

function isWorkStatus(value: unknown): value is WorkStatus {
  return value === 'writing' || value === 'completed'
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

export const worksHandlers = [
  // 新しい順(作成順の逆)。createdAt の同時刻で並びがぶれないよう、挿入順を使う
  http.get('/api/works', ({ request }) => {
    // 省略(null)は全件。空文字や未知の値は、黙って全件にせず 400 にする
    const status = new URL(request.url).searchParams.get('status')
    if (status !== null && !isWorkStatus(status)) {
      return HttpResponse.json(
        { message: 'status の値が正しくありません' },
        { status: 400 },
      )
    }

    const works = [...readDb().works].reverse()
    return HttpResponse.json(
      status === null ? works : works.filter((work) => work.status === status),
    )
  }),

  http.get('/api/works/:id', ({ params }) => {
    const work = readDb().works.find((work) => work.id === params.id)
    if (!work) {
      return HttpResponse.json(
        { message: '作品が見つかりません' },
        { status: 404 },
      )
    }
    return HttpResponse.json(work)
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

  // 受け付けるのは status の変更だけ(タイトルの変更は、必要になった時点で足す)
  http.patch('/api/works/:id', async ({ params, request }) => {
    const body = await readJson(request)
    if (
      typeof body !== 'object' ||
      body === null ||
      !('status' in body) ||
      !isWorkStatus(body.status)
    ) {
      return HttpResponse.json(
        { message: 'リクエストの形式が正しくありません' },
        { status: 400 },
      )
    }

    // 読み込みから書き込みの間に await を挟まない
    const db = readDb()
    const current = db.works.find((work) => work.id === params.id)
    if (!current) {
      return HttpResponse.json(
        { message: '作品が見つかりません' },
        { status: 404 },
      )
    }

    const updated: Work = {
      ...current,
      status: body.status,
      updatedAt: new Date().toISOString(),
    }
    writeDb({
      ...db,
      works: db.works.map((work) => (work.id === updated.id ? updated : work)),
    })
    return HttpResponse.json(updated)
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
