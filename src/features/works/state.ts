import { atom } from 'jotai'
import type { WorkStatus } from './types'

// 作品一覧で選んでいるタブ
export const statusTabAtom = atom<WorkStatus>('writing')
