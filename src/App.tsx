import { useAtom } from 'jotai'
import { selectedChapterIdAtom } from '@/features/chapters/state'
import { ChapterEditor } from '@/features/editor/ChapterEditor'
import { selectedWorkIdAtom } from '@/features/works/state'
import { WorkDetail } from '@/features/works/WorkDetail'
import { WorkForm } from '@/features/works/WorkForm'
import { WorkTabs } from '@/features/works/WorkTabs'

function App() {
  // 画面は 3 段: 作品の一覧 → 作品の画面(章の一覧)→ 本文エディタ。
  // 戻ると 1 段ずつ上がる。戻っても、一覧のタブ(statusTabAtom)は変えない
  const [workId, setWorkId] = useAtom(selectedWorkIdAtom)
  const [chapterId, setChapterId] = useAtom(selectedChapterIdAtom)

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">novel-studio</h1>
      {workId === null ? (
        <>
          <WorkForm />
          <WorkTabs />
        </>
      ) : chapterId === null ? (
        <WorkDetail
          workId={workId}
          onBack={() => setWorkId(null)}
          onOpenChapter={setChapterId}
        />
      ) : (
        <ChapterEditor
          chapterId={chapterId}
          onBack={() => setChapterId(null)}
        />
      )}
    </main>
  )
}

export default App
