import { useQuery } from '@tanstack/react-query'
import { fetchChapters } from './api'

export function useChapters(workId: string) {
  return useQuery({
    queryKey: ['chapters', workId],
    queryFn: () => fetchChapters(workId),
  })
}
