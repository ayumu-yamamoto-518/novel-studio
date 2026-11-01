import { deleteIdempotent, postJson } from '@/lib/http'
import type { Chapter } from './types'

export async function fetchChapters(workId: string): Promise<Chapter[]> {
  const res = await fetch(`/api/works/${encodeURIComponent(workId)}/chapters`)
  if (!res.ok) throw new Error(`章の取得に失敗しました: ${res.status}`)
  return res.json()
}

// 404(章が無い)は、例外ではなく null で返す。例外にすると、本番の QueryClient が
// 既定で再試行し、「章が見つかりません」を出すまで数秒待たされるため。
export async function fetchChapter(id: string): Promise<Chapter | null> {
  const res = await fetch(`/api/chapters/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`章の取得に失敗しました: ${res.status}`)
  return res.json()
}

export function deleteChapter(id: string): Promise<void> {
  return deleteIdempotent(
    `/api/chapters/${encodeURIComponent(id)}`,
    '章を削除できませんでした',
  )
}

export function createChapter(workId: string, title: string): Promise<Chapter> {
  return postJson(
    `/api/works/${encodeURIComponent(workId)}/chapters`,
    { title },
    '章を追加できませんでした',
  )
}
