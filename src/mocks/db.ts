import type { Work } from '@/features/works/types'

export type Db = { works: Work[] }

const STORAGE_KEY = 'novel-studio:db'

function emptyDb(): Db {
  return { works: [] }
}

// キャッシュを持たず、リクエストごとに localStorage を読み書きする。
// 壊れたデータは空の DB として扱い、画面を落とさない。
export function readDb(): Db {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return emptyDb()

  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'works' in parsed &&
      Array.isArray(parsed.works)
    ) {
      return { works: parsed.works }
    }
  } catch {
    // 壊れた JSON は下の空の DB にする
  }
  return emptyDb()
}

export function writeDb(db: Db): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}
