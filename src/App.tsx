import { WorkForm } from '@/features/works/WorkForm'
import { WorkList } from '@/features/works/WorkList'

function App() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">novel-studio</h1>
      <WorkForm />
      <WorkList />
    </main>
  )
}

export default App
