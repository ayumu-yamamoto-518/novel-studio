// 400 のときは、サーバーが返した検証メッセージをそのまま画面に出せるよう、
// その文言で例外にする。それ以外の失敗は fallbackMessage にする(サーバーの
// 内部情報などを画面に出さないため、400 以外は本文の message を使わない)。
export async function postJson<T>(
  url: string,
  body: unknown,
  fallbackMessage: string,
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) return res.json()

  const errorBody: unknown = await res.json().catch(() => null)
  if (
    res.status === 400 &&
    typeof errorBody === 'object' &&
    errorBody !== null &&
    'message' in errorBody &&
    typeof errorBody.message === 'string'
  ) {
    throw new Error(errorBody.message)
  }
  throw new Error(fallbackMessage)
}

// 404(既に無い)は成功として扱う。目的の「それが無い状態」は達成済みで、
// 二重クリックや別のタブでの削除でも、利用者にエラーを見せないため。
export async function deleteIdempotent(
  url: string,
  errorMessage: string,
): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw new Error(errorMessage)
  }
}
