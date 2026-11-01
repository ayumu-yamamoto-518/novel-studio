import { useWorks } from './queries'

export function WorkList() {
  const { data, isPending, isError } = useWorks()

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
    <ul className="space-y-2">
      {data.map((work) => (
        <li key={work.id}>{work.title}</li>
      ))}
    </ul>
  )
}
