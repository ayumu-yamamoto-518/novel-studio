import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createChapter,
  deleteChapter,
  fetchChapter,
  fetchChapters,
} from './api'

export function useChapters(workId: string) {
  return useQuery({
    queryKey: ['chapters', workId],
    queryFn: () => fetchChapters(workId),
  })
}

// 章が無い(404)ときは、data が null になる
export function useChapter(id: string) {
  return useQuery({
    queryKey: ['chapter', id],
    queryFn: () => fetchChapter(id),
  })
}

export function useCreateChapter(workId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (title: string) => createChapter(workId, title),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['chapters', workId] }),
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
