import { describe, expectTypeOf, it } from 'vitest'
import type { Chapter } from './types'

describe('章の型', () => {
  it('章は作品の id・タイトル・本文・作成日時・更新日時だけを持つ', () => {
    expectTypeOf<Chapter>().toEqualTypeOf<{
      id: string
      workId: string
      title: string
      body: string
      createdAt: string
      updatedAt: string
    }>()
  })

  it('ステータスは作品にのみ付き、章は持たない', () => {
    expectTypeOf<Chapter>().not.toHaveProperty('status')
  })
})
