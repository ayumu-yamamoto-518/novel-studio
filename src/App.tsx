import { useAtom } from 'jotai'
import { selectedWorkIdAtom } from '@/features/works/state'
import { WorkDetail } from '@/features/works/WorkDetail'
import { WorkForm } from '@/features/works/WorkForm'
import { WorkTabs } from '@/features/works/WorkTabs'

function App() {
  // null なら作品の一覧、値があればその作品の画面。戻っても、一覧のタブは変えない
  const [workId, setWorkId] = useAtom(selectedWorkIdAtom)

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">novel-studio</h1>
      {workId === null ? (
        <>
          <WorkForm />
          <WorkTabs />
        </>
      ) : (
        <WorkDetail workId={workId} onBack={() => setWorkId(null)} />
      )}
    </main>
  )
}

export default App
