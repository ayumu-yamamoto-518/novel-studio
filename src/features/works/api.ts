import type { Work } from './types'

export async function fetchWorks(): Promise<Work[]> {
  const res = await fetch('/api/works')
  if (!res.ok) throw new Error(`作品の取得に失敗しました: ${res.status}`)
  return res.json()
}
