import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useChapter, useUpdateChapterBody } from '@/features/chapters/queries'
import { countCharacters } from './count-characters'

const DISCARD_MESSAGE = '未保存の変更があります。破棄して戻りますか?'

export function ChapterEditor({
  chapterId,
  onBack,
}: {
  chapterId: string
  onBack: () => void
}) {
  const { data: chapter, isPending, isError } = useChapter(chapterId)

  if (isPending) return <p>読み込み中…</p>
  if (isError) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-destructive">
          章を読み込めませんでした
        </p>
        <Button variant="ghost" size="sm" onClick={onBack}>
          章の一覧に戻る
        </Button>
      </div>
    )
  }
  // 別のタブなどで、章や作品が消された場合
  if (chapter === null) {
    return (
      <div className="space-y-2">
        <p>章が見つかりません</p>
        <Button variant="ghost" size="sm" onClick={onBack}>
          章の一覧に戻る
        </Button>
      </div>
    )
  }

  // key で作り直し、別の章を開いたときに前の章の下書きを持ち越さない
  return (
    <EditorForm
      key={chapter.id}
      chapterId={chapter.id}
      title={chapter.title}
      savedBody={chapter.body}
      onBack={onBack}
    />
  )
}

function EditorForm({
  chapterId,
  title,
  savedBody,
  onBack,
}: {
  chapterId: string
  title: string
  savedBody: string
  onBack: () => void
}) {
  // 入力途中の本文は、このフォームの中だけで使うのでローカル状態にする
  const [draft, setDraft] = useState(savedBody)
  const { mutate, isPending, error } = useUpdateChapterBody(chapterId)
  // 未保存かどうかは、下書きと、サーバーに保存されている本文の違いで決める
  const isDirty = draft !== savedBody

  // 未保存の本文は、戻ると失われる。自動保存は作らないので、確認してから戻る
  function handleBack() {
    if (isDirty && !window.confirm(DISCARD_MESSAGE)) return
    onBack()
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={handleBack}>
        章の一覧に戻る
      </Button>
      <h2 className="text-xl font-bold break-all">{title}</h2>
      <div className="space-y-2">
        <Label htmlFor="chapter-body">本文</Label>
        <Textarea
          id="chapter-body"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          文字数: {countCharacters(draft)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button disabled={!isDirty || isPending} onClick={() => mutate(draft)}>
          保存
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {isDirty ? '未保存の変更があります' : '保存済み'}
        </p>
      </div>
      {/* 入力を元に戻して「保存済み」になったら、保存失敗の表示は不要なので消す */}
      {error && isDirty && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  )
}
