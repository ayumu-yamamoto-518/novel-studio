const MAX_TITLE_LENGTH = 100

export type TitleResult =
  { ok: true; title: string } | { ok: false; message: string }

// 前後の空白(全角スペース・改行を含む)を除いて、1〜100文字であることを確かめる。
// 𠮷 のようなサロゲートペアが2文字に数えられないよう、コードポイント単位で数える。
export function validateTitle(raw: string): TitleResult {
  const title = raw.trim()

  if (title.length === 0) {
    return { ok: false, message: 'タイトルを入力してください' }
  }
  if ([...title].length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      message: `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください`,
    }
  }
  return { ok: true, title }
}
