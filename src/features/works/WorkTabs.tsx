import { useAtom, useSetAtom } from 'jotai'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { selectedWorkIdAtom, statusTabAtom } from './state'
import { WorkList } from './WorkList'

export function WorkTabs() {
  const [status, setStatus] = useAtom(statusTabAtom)
  const setSelectedWorkId = useSetAtom(selectedWorkIdAtom)

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
        {/* key で作り直し、操作中の状態やエラー表示を別のタブへ持ち越さない */}
        <WorkList key={status} status={status} onOpen={setSelectedWorkId} />
      </TabsContent>
    </Tabs>
  )
}
