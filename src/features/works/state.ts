import { atom } from 'jotai'
import type { WorkStatus } from './types'

// 作品一覧で選んでいるタブ
export const statusTabAtom = atom<WorkStatus>('writing')

// 開いている作品の id。null なら作品一覧の画面
export const selectedWorkIdAtom = atom<string | null>(null)
