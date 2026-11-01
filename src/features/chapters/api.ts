import { deleteIdempotent } from '@/lib/http'
import type { Chapter } from './types'

export async function fetchChapters(workId: string): Promise<Chapter[]> {
  const res = await fetch(`/api/works/${encodeURIComponent(workId)}/chapters`)
  if (!res.ok) throw new Error(`章の取得に失敗しました: ${res.status}`)
  return res.json()
}

export function deleteChapter(id: string): Promise<void> {
  return deleteIdempotent(
    `/api/chapters/${encodeURIComponent(id)}`,
    '章を削除できませんでした',
  )
}
