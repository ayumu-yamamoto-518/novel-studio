import type { Chapter } from '@/features/chapters/types'
import type { Work } from '@/features/works/types'
import { writeDb } from '@/mocks/db'

// テストの準備用。必要な分だけ渡し、渡さなかった側は空にする
export function seedDb({
  works = [],
  chapters = [],
}: {
  works?: Work[]
  chapters?: Chapter[]
}): void {
  writeDb({ works, chapters })
}
