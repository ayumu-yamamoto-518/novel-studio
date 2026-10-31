import { useQuery, type UseQueryResult } from '@tanstack/react-query'

type Health = { status: string }

async function fetchHealth(): Promise<Health> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error(`health check failed: ${res.status}`)
  return res.json()
}

export function useHealth(): UseQueryResult<Health> {
  return useQuery({ queryKey: ['health'], queryFn: fetchHealth })
}
