import { describe, expect, it } from 'vitest'
import { countCharacters } from './count-characters'

describe('countCharacters', () => {
  it('空文字は 0 文字である', () => {
    expect(countCharacters('')).toBe(0)
  })

  it('空白と改行を除いて数える', () => {
    expect(countCharacters('あ い\nう')).toBe(3)
  })

  it.each([
    ['全角スペース', '　'],
    ['半角スペース', ' '],
    ['改行(LF)', '\n'],
    ['改行(CRLF)', '\r\n'],
    ['タブ', '\t'],
    ['それらの組み合わせ', '　\n \t\r\n'],
  ])('%sだけなら 0 文字である', (_, text) => {
    expect(countCharacters(text)).toBe(0)
  })

  it('CRLF の改行は 1 文字に数えない(前後の 2 文字だけ数える)', () => {
    expect(countCharacters('a\r\nb')).toBe(2)
  })

  it('NBSP(ノーブレークスペース)も空白として除く', () => {
    expect(countCharacters('a b')).toBe(2)
  })

  it('半角英数字は 1 文字ずつ数える', () => {
    expect(countCharacters('abc 123')).toBe(6)
  })

  it('サロゲートペアの文字(𠮷)を 1 文字と数える', () => {
    expect(countCharacters('𠮷')).toBe(1)
    expect(countCharacters('𠮷野家')).toBe(3)
  })

  it('ZWJ でつながる絵文字(👨‍👩‍👧)を 1 文字と数える', () => {
    expect(countCharacters('👨‍👩‍👧')).toBe(1)
  })

  it('国旗の絵文字(🇯🇵)を 1 文字と数える', () => {
    expect(countCharacters('🇯🇵')).toBe(1)
  })

  it('濁点が分解された形(か + 結合濁点)を 1 文字と数える', () => {
    expect(countCharacters('が')).toBe(1)
    expect(countCharacters('がき')).toBe(2)
  })

  it('長い本文でも数えられる', () => {
    const text = 'あいう え\n'.repeat(10_000)

    // 1 行に 4 文字(あ・い・う・え)。空白と改行は数えない
    expect(countCharacters(text)).toBe(40_000)
  })
})
