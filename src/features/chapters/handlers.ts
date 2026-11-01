import { http, HttpResponse } from 'msw'
import { validateTitle } from '@/lib/title'
import { readDb, writeDb } from '@/mocks/db'
import type { Chapter } from './types'

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

function workNotFound() {
  return HttpResponse.json({ message: '作品が見つかりません' }, { status: 404 })
}

export const chaptersHandlers = [
  // 作成順(保存された順)。作品の一覧(新しい順)とは逆で、章は読む順に並べる
  http.get('/api/works/:workId/chapters', ({ params }) => {
    const db = readDb()
    if (!db.works.some((work) => work.id === params.workId)) {
      return workNotFound()
    }
    return HttpResponse.json(
      db.chapters.filter((chapter) => chapter.workId === params.workId),
    )
  }),

  http.post('/api/works/:workId/chapters', async ({ params, request }) => {
    // 形・タイトルの不正は、作品の存在より先に返す(作品の PATCH と同じ順序)
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
    const db = readDb()
    if (!db.works.some((work) => work.id === params.workId)) {
      return workNotFound()
    }

    const now = new Date().toISOString()
    const chapter: Chapter = {
      id: crypto.randomUUID(),
      workId: String(params.workId),
      title: result.title,
      body: '',
      createdAt: now,
      updatedAt: now,
    }
    writeDb({ ...db, chapters: [...db.chapters, chapter] })

    return HttpResponse.json(chapter, { status: 201 })
  }),

  http.get('/api/chapters/:id', ({ params }) => {
    const chapter = readDb().chapters.find(
      (chapter) => chapter.id === params.id,
    )
    if (!chapter) {
      return HttpResponse.json(
        { message: '章が見つかりません' },
        { status: 404 },
      )
    }
    return HttpResponse.json(chapter)
  }),

  // 受け付けるのは本文(body)の変更だけ(章名の変更は、必要になった時点で足す)
  http.patch('/api/chapters/:id', async ({ params, request }) => {
    // 本文の形の不正は、章の存在より先に返す(作品の PATCH と同じ順序)
    const requestBody = await readJson(request)
    if (
      typeof requestBody !== 'object' ||
      requestBody === null ||
      !('body' in requestBody) ||
      typeof requestBody.body !== 'string'
    ) {
      return HttpResponse.json(
        { message: 'リクエストの形式が正しくありません' },
        { status: 400 },
      )
    }

    // 読み込みから書き込みの間に await を挟まない
    const db = readDb()
    const current = db.chapters.find((chapter) => chapter.id === params.id)
    if (!current) {
      return HttpResponse.json(
        { message: '章が見つかりません' },
        { status: 404 },
      )
    }

    const updated: Chapter = {
      ...current,
      body: requestBody.body,
      updatedAt: new Date().toISOString(),
    }
    writeDb({
      ...db,
      chapters: db.chapters.map((chapter) =>
        chapter.id === updated.id ? updated : chapter,
      ),
    })
    return HttpResponse.json(updated)
  }),

  http.delete('/api/chapters/:id', ({ params }) => {
    const db = readDb()
    if (!db.chapters.some((chapter) => chapter.id === params.id)) {
      return HttpResponse.json(
        { message: '章が見つかりません' },
        { status: 404 },
      )
    }

    writeDb({
      ...db,
      chapters: db.chapters.filter((chapter) => chapter.id !== params.id),
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
