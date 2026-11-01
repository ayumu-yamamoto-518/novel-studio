import { useChapters } from './queries'

export function ChapterList({ workId }: { workId: string }) {
  const { data, isPending, isError } = useChapters(workId)

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
    <ul className="space-y-2">
      {data.map((chapter) => (
        <li key={chapter.id}>{chapter.title}</li>
      ))}
    </ul>
  )
}
