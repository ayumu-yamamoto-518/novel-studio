import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWork, deleteWork, fetchWorks } from './api'
import type { WorkStatus } from './types'

// キーの先頭が ['works'] なので、['works'] での invalidate は全ステータスに効く
export function useWorks(status: WorkStatus) {
  return useQuery({
    queryKey: ['works', { status }],
    queryFn: () => fetchWorks(status),
  })
}

export function useCreateWork() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWork,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['works'] }),
  })
}

// 失敗したときも取り直し、画面と保存先がずれていないようにする
export function useDeleteWork() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWork,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['works'] }),
  })
}
