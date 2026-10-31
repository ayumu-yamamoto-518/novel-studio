import type { RequestHandler } from 'msw'
import { worksHandlers } from '@/features/works/handlers'

export const handlers: RequestHandler[] = [...worksHandlers]
