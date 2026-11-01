import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createChapter,
  deleteChapter,
  fetchChapter,
  fetchChapters,
  updateChapterBody,
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

// 保存に成功したら、応答の章でキャッシュを置き換える(再取得を待たずに「保存済み」になる)。
// 失敗したときは何も変えない(下書きが残り、「未保存」のままになる)
export function useUpdateChapterBody(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: string) => updateChapterBody(id, body),
    onSuccess: (chapter) => queryClient.setQueryData(['chapter', id], chapter),
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
