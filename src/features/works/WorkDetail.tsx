import { Button } from '@/components/ui/button'
import { ChapterForm } from '@/features/chapters/ChapterForm'
import { ChapterList } from '@/features/chapters/ChapterList'
import { useWork } from './queries'

export function WorkDetail({
  workId,
  onBack,
}: {
  workId: string
  onBack: () => void
}) {
  const { data: work, isPending, isError } = useWork(workId)

  if (isPending) return <p>読み込み中…</p>
  if (isError) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-destructive">
          作品を読み込めませんでした
        </p>
        <Button variant="ghost" size="sm" onClick={onBack}>
          作品一覧に戻る
        </Button>
      </div>
    )
  }
  // 別のタブなどで消された場合
  if (work === null) {
    return (
      <div className="space-y-2">
        <p>作品が見つかりません</p>
        <Button variant="ghost" size="sm" onClick={onBack}>
          作品一覧に戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        作品一覧に戻る
      </Button>
      <h2 className="text-xl font-bold break-all">{work.title}</h2>
      <ChapterForm workId={workId} />
      <ChapterList workId={workId} />
    </div>
  )
}
