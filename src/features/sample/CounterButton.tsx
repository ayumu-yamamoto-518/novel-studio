import { useAtom } from 'jotai'
import { Button } from '@/components/ui/button'
import { countAtom } from './count-atom'

export function CounterButton() {
  const [count, setCount] = useAtom(countAtom)

  return <Button onClick={() => setCount((c) => c + 1)}>count: {count}</Button>
}
