import { http, HttpResponse } from 'msw'
import { readDb } from '@/mocks/db'

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
]
