import { Button } from '@/components/ui/button'
import { useDeleteWork, useWorks } from './queries'

export function WorkList() {
  const { data, isPending, isError } = useWorks()
  const {
    mutate: remove,
    isPending: isDeleting,
    error: deleteError,
  } = useDeleteWork()

  if (isPending) return <p>読み込み中…</p>
  if (isError) {
    return (
      <p role="alert" className="text-destructive">
        作品を読み込めませんでした
      </p>
    )
  }
  if (data.length === 0) return <p>作品がありません</p>

  return (
    <>
      <ul className="space-y-2">
        {data.map((work) => (
          <li key={work.id} className="flex items-center justify-between gap-2">
            <span>{work.title}</span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`「${work.title}」を削除`}
              disabled={isDeleting}
              onClick={() => remove(work.id)}
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
