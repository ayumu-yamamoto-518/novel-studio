import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { deleteIdempotent, postJson } from './http'

describe('postJson', () => {
  it('JSON を POST し、成功したら応答の本文を返す', async () => {
    server.use(
      http.post('/api/test', async ({ request }) =>
        HttpResponse.json(
          {
            method: request.method,
            contentType: request.headers.get('Content-Type'),
            body: await request.json(),
          },
          { status: 201 },
        ),
      ),
    )

    const result = await postJson('/api/test', { title: '題' }, '失敗')

    expect(result).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: { title: '題' },
    })
  })

  it('400 で本文に message があれば、その文言で例外にする', async () => {
    server.use(
      http.post('/api/test', () =>
        HttpResponse.json({ message: '検証メッセージ' }, { status: 400 }),
      ),
    )

    await expect(postJson('/api/test', {}, '失敗')).rejects.toThrow(
      '検証メッセージ',
    )
  })

  it.each([
    ['message の無い 400', () => HttpResponse.json({}, { status: 400 })],
    [
      'message が文字列でない 400',
      () => HttpResponse.json({ message: 1 }, { status: 400 }),
    ],
    [
      'JSON でない本文の 400',
      () => new HttpResponse('not json', { status: 400 }),
    ],
    ['本文の無い 400', () => new HttpResponse(null, { status: 400 })],
  ])('%sは、fallbackMessage で例外にする', async (_, respond) => {
    server.use(http.post('/api/test', respond))

    await expect(postJson('/api/test', {}, '作れませんでした')).rejects.toThrow(
      '作れませんでした',
    )
  })

  it('400 以外の失敗は、本文に message があっても fallbackMessage で例外にする', async () => {
    server.use(
      http.post('/api/test', () =>
        HttpResponse.json({ message: 'サーバーの内部情報' }, { status: 500 }),
      ),
    )

    await expect(postJson('/api/test', {}, '作れませんでした')).rejects.toThrow(
      '作れませんでした',
    )
  })
})

describe('deleteIdempotent', () => {
  it('DELETE を送り、204 なら成功する', async () => {
    let method = ''
    server.use(
      http.delete('/api/test', ({ request }) => {
        method = request.method
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(deleteIdempotent('/api/test', '失敗')).resolves.toBeUndefined()
    expect(method).toBe('DELETE')
  })

  it('404(既に無い)も成功として扱う', async () => {
    server.use(
      http.delete('/api/test', () =>
        HttpResponse.json({ message: '無い' }, { status: 404 }),
      ),
    )

    await expect(deleteIdempotent('/api/test', '失敗')).resolves.toBeUndefined()
  })

  it('それ以外の失敗は、errorMessage で例外にする', async () => {
    server.use(
      http.delete('/api/test', () => new HttpResponse(null, { status: 500 })),
    )

    await expect(
      deleteIdempotent('/api/test', '削除できませんでした'),
    ).rejects.toThrow('削除できませんでした')
  })
})
