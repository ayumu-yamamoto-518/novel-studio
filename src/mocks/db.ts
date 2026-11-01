import type { Work } from '@/features/works/types'

export type Db = { works: Work[] }

const STORAGE_KEY = 'novel-studio:db'

function emptyDb(): Db {
  return { works: [] }
}

function isWork(value: unknown): value is Work {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'status' in value &&
    (value.status === 'writing' || value.status === 'completed') &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'updatedAt' in value &&
    typeof value.updatedAt === 'string'
  )
}

// キャッシュを持たず、リクエストごとに localStorage を読み書きする。
// 壊れたデータで画面を落とさないよう、JSON が壊れていれば空の DB にし、
// 作品の形をしていない要素は捨てて、正しい作品だけを返す。
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
      return { works: parsed.works.filter(isWork) }
    }
  } catch {
    // 壊れた JSON は下の空の DB にする
  }
  return emptyDb()
}

export function writeDb(db: Db): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}
