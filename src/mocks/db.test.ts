import { describe, expect, it } from 'vitest'
import type { Work } from '@/features/works/types'
import { readDb, writeDb } from './db'

const work: Work = {
  id: 'w1',
  title: '吾輩は猫である',
  status: 'writing',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

describe('db', () => {
  it('何も保存されていなければ、空の DB を返す', () => {
    expect(readDb()).toEqual({ works: [] })
  })

  it('書き込んだ内容を、読み込むと同じ形で返す', () => {
    writeDb({ works: [work] })

    expect(readDb()).toEqual({ works: [work] })
  })

  it('壊れた JSON は、空の DB として扱う', () => {
    localStorage.setItem('novel-studio:db', '{broken')

    expect(readDb()).toEqual({ works: [] })
  })

  it('works が配列でない JSON は、空の DB として扱う', () => {
    localStorage.setItem('novel-studio:db', JSON.stringify({ works: 'x' }))

    expect(readDb()).toEqual({ works: [] })
  })

  it('JSON がオブジェクトでない場合も、空の DB として扱う', () => {
    localStorage.setItem('novel-studio:db', 'null')

    expect(readDb()).toEqual({ works: [] })
  })

  it('作品の形をしていない要素は捨て、正しい作品だけを返す', () => {
    const broken = [
      null,
      1,
      'x',
      {},
      { ...work, id: 1 },
      { ...work, title: {} },
      { ...work, status: 'archived' },
      { ...work, createdAt: undefined },
    ]
    localStorage.setItem(
      'novel-studio:db',
      JSON.stringify({ works: [...broken, work] }),
    )

    expect(readDb()).toEqual({ works: [work] })
  })

  it('テストごとに localStorage が空に戻る(1つ目のテストの書き込みが残らない)', () => {
    expect(localStorage.getItem('novel-studio:db')).toBeNull()
  })
})
