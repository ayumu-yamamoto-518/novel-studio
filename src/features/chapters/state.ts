import { atom } from 'jotai'

// 開いている章(本文エディタ)の id。null なら、作品の画面(章の一覧)
export const selectedChapterIdAtom = atom<string | null>(null)
