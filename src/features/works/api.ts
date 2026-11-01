import type { Work } from './types'

export async function fetchWorks(): Promise<Work[]> {
  const res = await fetch('/api/works')
  if (!res.ok) throw new Error(`作品の取得に失敗しました: ${res.status}`)
  return res.json()
}

// 400 のときは、サーバーが返した検証メッセージをそのまま画面に出せるよう Error にする
export async function createWork(title: string): Promise<Work> {
  const res = await fetch('/api/works', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (res.ok) return res.json()

  const body: unknown = await res.json().catch(() => null)
  if (
    res.status === 400 &&
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    throw new Error(body.message)
  }
  throw new Error('作品を作成できませんでした')
}
