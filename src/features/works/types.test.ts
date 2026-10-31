import { describe, expectTypeOf, it } from 'vitest'
import type { Work, WorkStatus } from './types'

describe('作品の型', () => {
  it('ステータスは「執筆中」と「完了」の2つだけである', () => {
    expectTypeOf<WorkStatus>().toEqualTypeOf<'writing' | 'completed'>()
  })

  it('作品は id・タイトル・ステータス・作成日時・更新日時だけを持つ', () => {
    expectTypeOf<Work>().toEqualTypeOf<{
      id: string
      title: string
      status: WorkStatus
      createdAt: string
      updatedAt: string
    }>()
  })
})
