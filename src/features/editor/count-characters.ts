// 書記素(見た目の1文字)単位で数えるための分割器。毎回作ると重いので、1回だけ作る
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// 空白・改行(全角スペース・タブ・NBSP を含む)を除いて、見た目の1文字ずつ数える。
// 𠮷(サロゲートペア)・👨‍👩‍👧(ZWJ でつながる絵文字)・か゛(分解された濁点)は 1 文字。
export function countCharacters(text: string): number {
  return Array.from(segmenter.segment(text.replace(/\s/g, ''))).length
}
