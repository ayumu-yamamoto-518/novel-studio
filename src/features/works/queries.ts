import { useQuery } from '@tanstack/react-query'
import { fetchWorks } from './api'

export function useWorks() {
  return useQuery({ queryKey: ['works'], queryFn: fetchWorks })
}
