import { deleteIdempotent, postJson } from '@/lib/http'
import type { Work, WorkStatus } from './types'

export async function fetchWorks(status: WorkStatus): Promise<Work[]> {
  const res = await fetch(`/api/works?status=${status}`)
  if (!res.ok) throw new Error(`作品の取得に失敗しました: ${res.status}`)
  return res.json()
}

// 404(作品が無い)は、例外ではなく null で返す。例外にすると、本番の QueryClient が
// 既定で再試行し、「作品が見つかりません」を出すまで数秒待たされるため。
export async function fetchWork(id: string): Promise<Work | null> {
  const res = await fetch(`/api/works/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
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

export function deleteWork(id: string): Promise<void> {
  return deleteIdempotent(
    `/api/works/${encodeURIComponent(id)}`,
    '作品を削除できませんでした',
  )
}

export function createWork(title: string): Promise<Work> {
  return postJson('/api/works', { title }, '作品を作成できませんでした')
}
