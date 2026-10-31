export type WorkStatus = 'writing' | 'completed'

export type Work = {
  id: string
  title: string
  status: WorkStatus
  createdAt: string
  updatedAt: string
}
