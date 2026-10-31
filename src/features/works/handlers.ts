import { http, HttpResponse } from 'msw'
import { readDb } from '@/mocks/db'

export const worksHandlers = [
  // 新しい順(作成順の逆)。createdAt の同時刻で並びがぶれないよう、挿入順を使う
  http.get('/api/works', () => {
    return HttpResponse.json([...readDb().works].reverse())
  }),
]
