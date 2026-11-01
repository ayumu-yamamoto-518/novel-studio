import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWork, fetchWorks } from './api'

export function useWorks() {
  return useQuery({ queryKey: ['works'], queryFn: fetchWorks })
}

export function useCreateWork() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWork,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['works'] }),
  })
}
