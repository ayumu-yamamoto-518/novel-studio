import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Chapter } from '@/features/chapters/types'
import type { Work } from '@/features/works/types'
import { server } from '@/mocks/server'
import { seedDb } from '@/test/db'
import { createTestQueryClient, renderWithClient } from '@/test/render'
import { ChapterEditor } from './ChapterEditor'

function makeWork(id: string, title: string): Work {
  return {
    id,
    title,
    status: 'writing',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

function makeChapter(
  id: string,
  workId: string,
  title: string,
  body = '',
): Chapter {
  return {
    id,
    workId,
    title,
    body,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

// 開く章は c2(w2 の 2 番目)。先頭の章や w1 を固定で見ていても通らないようにする
function seedChapters() {
  seedDb({
    works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')],
    chapters: [
      makeChapter('c1', 'w1', '別の作品の章', '別の作品の本文'),
      makeChapter('c2', 'w2', '開く章', 'こんにちは\n世界'),
      makeChapter('c3', 'w2', '次の章', '次の章の本文'),
    ],
  })
}

function renderEditor(chapterId = 'c2', onBack = () => {}) {
  return renderWithClient(
    <ChapterEditor chapterId={chapterId} onBack={onBack} />,
  )
}

describe('ChapterEditor の表示', () => {
  it('読み込み中は、その旨を表示する', () => {
    renderEditor()

    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  })

  it('章名を見出しに、保存済みの本文をテキストエリアに表示する(開いた章のもの)', async () => {
    seedChapters()

    renderEditor('c2')

    expect(
      await screen.findByRole('heading', { name: '開く章' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界')
    expect(
      screen.queryByRole('heading', { name: '別の作品の章' }),
    ).not.toBeInTheDocument()
  })

  it('章が見つからなければ、「章が見つかりません」と戻るボタンだけを表示する', async () => {
    seedChapters()
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderEditor('gone', onBack)

    expect(await screen.findByText('章が見つかりません')).toBeInTheDocument()
    expect(screen.queryByLabelText('本文')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '章の一覧に戻る' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('読み込みに失敗(500)したら、「見つかりません」とは別に、エラーと戻るボタンを表示する', async () => {
    server.use(
      http.get(
        '/api/chapters/:id',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderEditor('c2', onBack)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '章を読み込めませんでした',
    )
    expect(screen.queryByText('章が見つかりません')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '章の一覧に戻る' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('ChapterEditor の文字数', () => {
  it('保存済みの本文の文字数を、空白と改行を除いて表示する', async () => {
    seedChapters()

    renderEditor('c2')

    // 「こんにちは」「世界」の 7 文字(改行は数えない)
    expect(await screen.findByText('文字数: 7')).toBeInTheDocument()
  })

  it('入力すると、文字数が増える', async () => {
    seedDb({
      works: [makeWork('w2', '作品2')],
      chapters: [makeChapter('c2', 'w2', '開く章', '')],
    })
    const user = userEvent.setup()
    renderEditor('c2')
    expect(await screen.findByText('文字数: 0')).toBeInTheDocument()

    await user.type(screen.getByLabelText('本文'), 'あい')

    expect(screen.getByText('文字数: 2')).toBeInTheDocument()
  })

  it('空白(全角スペースを含む)と改行は数えない', async () => {
    seedDb({
      works: [makeWork('w2', '作品2')],
      chapters: [makeChapter('c2', 'w2', '開く章', '')],
    })
    const user = userEvent.setup()
    renderEditor('c2')
    await user.click(await screen.findByLabelText('本文'))

    await user.paste('あ い　う\n\nえ\t')

    expect(screen.getByText('文字数: 4')).toBeInTheDocument()
  })

  it('絵文字や結合文字を、見た目の 1 文字と数える', async () => {
    seedDb({
      works: [makeWork('w2', '作品2')],
      chapters: [makeChapter('c2', 'w2', '開く章', '')],
    })
    const user = userEvent.setup()
    renderEditor('c2')
    await user.click(await screen.findByLabelText('本文'))

    // 𠮷・家族の絵文字・分解形の「か゛」・国旗が各 1 文字
    await user.paste('𠮷👨‍👩‍👧が🇯🇵')

    expect(screen.getByText('文字数: 4')).toBeInTheDocument()
  })

  it('大きな本文(2 万文字)を貼り付けても、文字数を数えられる', async () => {
    seedDb({
      works: [makeWork('w2', '作品2')],
      chapters: [makeChapter('c2', 'w2', '開く章', '')],
    })
    const user = userEvent.setup()
    renderEditor('c2')
    await user.click(await screen.findByLabelText('本文'))

    await user.paste('あいう え\n'.repeat(5_000))

    expect(screen.getByText('文字数: 20000')).toBeInTheDocument()
  })

  it('別の章を開くと、前の章の下書きではなく、その章の本文を表示する', async () => {
    seedChapters()
    // 同じ ChapterEditor のまま chapterId だけを切り替えるための、テスト用の部品
    function Switcher() {
      const [chapterId, setChapterId] = useState('c2')
      return (
        <>
          <button onClick={() => setChapterId('c3')}>次の章を開く</button>
          <ChapterEditor chapterId={chapterId} onBack={() => {}} />
        </>
      )
    }
    // 切り替え先の章を先にキャッシュしておく。未取得だと、一度「読み込み中…」になって
    // EditorForm が作り直されてしまい、key が無くても下書きが消えて、key を確かめられない
    const client = createTestQueryClient()
    client.setQueryData(
      ['chapter', 'c3'],
      makeChapter('c3', 'w2', '次の章', '次の章の本文'),
    )
    const user = userEvent.setup()
    renderWithClient(<Switcher />, client)
    await user.type(await screen.findByLabelText('本文'), '書きかけ')

    await user.click(screen.getByRole('button', { name: '次の章を開く' }))

    expect(
      await screen.findByRole('heading', { name: '次の章' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('本文')).toHaveValue('次の章の本文')
  })
})
