import type { Work, WorkStatus } from './types'

export async function fetchWorks(status: WorkStatus): Promise<Work[]> {
  const res = await fetch(`/api/works?status=${status}`)
  if (!res.ok) throw new Error(`作品の取得に失敗しました: ${res.status}`)
  return res.json()
}

// 既に消えた作品(404)の変更は、成功にしない。変更した結果を利用者に見せられないため
export async function updateWorkStatus(
  id: string,
  status: WorkStatus,
): Promise<Work> {
  const res = await fetch(`/api/works/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('ステータスを変更できませんでした')
  return res.json()
}

// 404(既に無い)は成功として扱う。目的の「その作品が無い状態」は達成済みで、
// 二重クリックや別のタブでの削除でも、利用者にエラーを見せないため。
export async function deleteWork(id: string): Promise<void> {
  const res = await fetch(`/api/works/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    throw new Error('作品を削除できませんでした')
  }
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
