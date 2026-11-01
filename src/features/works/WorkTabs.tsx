import { useAtom } from 'jotai'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { statusTabAtom } from './state'
import { WorkList } from './WorkList'

export function WorkTabs() {
  const [status, setStatus] = useAtom(statusTabAtom)

  return (
    <Tabs
      value={status}
      onValueChange={(value) =>
        setStatus(value === 'completed' ? 'completed' : 'writing')
      }
    >
      <TabsList>
        <TabsTrigger value="writing">執筆中</TabsTrigger>
        <TabsTrigger value="completed">完了</TabsTrigger>
      </TabsList>
      <TabsContent value={status}>
        <WorkList status={status} />
      </TabsContent>
    </Tabs>
  )
}
