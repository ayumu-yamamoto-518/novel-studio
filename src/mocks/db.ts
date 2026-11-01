import type { Chapter } from '@/features/chapters/types'
import type { Work } from '@/features/works/types'

export type Db = { works: Work[]; chapters: Chapter[] }

const STORAGE_KEY = 'novel-studio:db'

function emptyDb(): Db {
  return { works: [], chapters: [] }
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

function isChapter(value: unknown): value is Chapter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'workId' in value &&
    typeof value.workId === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'body' in value &&
    typeof value.body === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'updatedAt' in value &&
    typeof value.updatedAt === 'string'
  )
}

// キャッシュを持たず、リクエストごとに localStorage を読み書きする。
// 壊れたデータで画面を落とさないよう、JSON が壊れていれば空の DB にし、
// 作品・章の形をしていない要素は捨てて、正しいものだけを返す。
// 章を足す前に保存された {"works":[...]} だけのデータは、章を空として読む。
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
      const chapters =
        'chapters' in parsed && Array.isArray(parsed.chapters)
          ? parsed.chapters.filter(isChapter)
          : []
      return { works: parsed.works.filter(isWork), chapters }
    }
  } catch {
    // 壊れた JSON は下の空の DB にする
  }
  return emptyDb()
}

export function writeDb(db: Db): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}
