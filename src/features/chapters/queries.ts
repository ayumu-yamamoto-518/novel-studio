import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteChapter, fetchChapters } from './api'

export function useChapters(workId: string) {
  return useQuery({
    queryKey: ['chapters', workId],
    queryFn: () => fetchChapters(workId),
  })
}

// 失敗したときも取り直し、画面と保存先がずれていないようにする
export function useDeleteChapter(workId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteChapter,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['chapters', workId] }),
  })
}
