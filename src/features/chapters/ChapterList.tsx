import { Button } from '@/components/ui/button'
import { useChapters, useDeleteChapter } from './queries'

export function ChapterList({ workId }: { workId: string }) {
  const { data, isPending, isError } = useChapters(workId)
  const {
    mutate: remove,
    isPending: isDeleting,
    error: deleteError,
  } = useDeleteChapter(workId)

  if (isPending) return <p>読み込み中…</p>
  if (isError) {
    return (
      <p role="alert" className="text-destructive">
        章を読み込めませんでした
      </p>
    )
  }
  if (data.length === 0) return <p>章がありません</p>

  return (
    <>
      <ul className="space-y-2">
        {data.map((chapter) => (
          <li
            key={chapter.id}
            className="flex items-center justify-between gap-2"
          >
            <span>{chapter.title}</span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`「${chapter.title}」を削除`}
              disabled={isDeleting}
              onClick={() => remove(chapter.id)}
            >
              削除
            </Button>
          </li>
        ))}
      </ul>
      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError.message}
        </p>
      )}
    </>
  )
}
