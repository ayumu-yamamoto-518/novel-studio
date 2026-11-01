import type { RequestHandler } from 'msw'
import { chaptersHandlers } from '@/features/chapters/handlers'
import { worksHandlers } from '@/features/works/handlers'

export const handlers: RequestHandler[] = [
  ...worksHandlers,
  ...chaptersHandlers,
]
