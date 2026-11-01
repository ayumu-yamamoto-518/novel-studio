import { useRef, useState, type SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateChapter } from './queries'

export function ChapterForm({ workId }: { workId: string }) {
  // 入力途中の文字列は、このフォームの中だけで使うのでローカル状態にする
  const [title, setTitle] = useState('')
  const { mutate, isPending, error } = useCreateChapter(workId)
  // isPending の反映は1拍遅れ、直後の2回目のクリックには間に合わない。
  // 同期的に効く ref で、送信中の再送信を防ぐ
  const submitting = useRef(false)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    mutate(title, {
      onSuccess: () => setTitle(''),
      onSettled: () => {
        submitting.current = false
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="chapter-title">章のタイトル</Label>
      <div className="flex gap-2">
        <Input
          id="chapter-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit" disabled={isPending}>
          章を追加
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </form>
  )
}
