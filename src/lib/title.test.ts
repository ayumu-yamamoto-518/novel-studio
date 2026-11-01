import { describe, expect, it } from 'vitest'
import { validateTitle } from './title'

describe('validateTitle', () => {
  it('1文字のタイトルは有効である', () => {
    expect(validateTitle('あ')).toEqual({ ok: true, title: 'あ' })
  })

  it('100文字のタイトルは有効である', () => {
    const title = 'あ'.repeat(100)

    expect(validateTitle(title)).toEqual({ ok: true, title })
  })

  it('101文字のタイトルは無効である', () => {
    expect(validateTitle('あ'.repeat(101))).toEqual({
      ok: false,
      message: 'タイトルは100文字以内で入力してください',
    })
  })

  it('空文字は無効である', () => {
    expect(validateTitle('')).toEqual({
      ok: false,
      message: 'タイトルを入力してください',
    })
  })

  it('空白だけのタイトルは無効である(全角スペース・改行を含む)', () => {
    expect(validateTitle(' 　\n\t ')).toEqual({
      ok: false,
      message: 'タイトルを入力してください',
    })
  })

  it('前後の空白(全角スペースを含む)を除いたタイトルを返す', () => {
    expect(validateTitle('　 吾輩は猫である \n')).toEqual({
      ok: true,
      title: '吾輩は猫である',
    })
  })

  it('サロゲートペアの文字(𠮷)を1文字として数える', () => {
    const title = '𠮷'.repeat(100)

    expect(validateTitle(title)).toEqual({ ok: true, title })
    expect(validateTitle('𠮷'.repeat(101)).ok).toBe(false)
  })

  it('文字数は前後の空白を除いてから数える', () => {
    expect(validateTitle(` ${'あ'.repeat(100)} `)).toEqual({
      ok: true,
      title: 'あ'.repeat(100),
    })
  })
})
