import { Button } from '@/components/ui/button'
import { useHealth } from '@/features/sample/useHealth'

function App() {
  const { data } = useHealth()

  return (
    <>
      <h1 className="text-2xl font-bold">novel-studio</h1>
      <Button>shadcn/ui</Button>
      {data && <p>API: {data.status}</p>}
    </>
  )
}

export default App
