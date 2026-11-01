import { act, screen, waitFor } from '@testing-library/react'
import { focusManager } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Chapter } from '@/features/chapters/types'
import type { Work } from '@/features/works/types'
import { readDb } from '@/mocks/db'
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

describe('ChapterEditor の保存', () => {
  it('開いた直後は「保存済み」で、保存ボタンは無効である', async () => {
    seedChapters()

    renderEditor('c2')

    expect(await screen.findByRole('status')).toHaveTextContent('保存済み')
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
  })

  it('入力すると「未保存の変更があります」になり、保存ボタンが有効になる', async () => {
    seedChapters()
    const user = userEvent.setup()
    renderEditor('c2')

    await user.type(await screen.findByLabelText('本文'), '！')

    expect(screen.getByRole('status')).toHaveTextContent(
      '未保存の変更があります',
    )
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
  })

  it('保存すると本文が保存され(他の章は変わらない)、「保存済み」に戻る', async () => {
    seedChapters()
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')

    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('保存済み'),
    )
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界！')
    const { chapters } = readDb()
    expect(chapters.map((chapter) => chapter.body)).toEqual([
      '別の作品の本文',
      'こんにちは\n世界！',
      '次の章の本文',
    ])
  })

  it('本文を空にして保存できる', async () => {
    seedChapters()
    const user = userEvent.setup()
    renderEditor('c2')
    await user.clear(await screen.findByLabelText('本文'))

    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('保存済み'),
    )
    expect(readDb().chapters[1].body).toBe('')
    expect(screen.getByText('文字数: 0')).toBeInTheDocument()
  })

  it('入力した内容を元に戻すと、「保存済み」に戻る', async () => {
    seedChapters()
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')
    expect(screen.getByRole('status')).toHaveTextContent(
      '未保存の変更があります',
    )

    await user.type(screen.getByLabelText('本文'), '{Backspace}')

    expect(screen.getByRole('status')).toHaveTextContent('保存済み')
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
  })

  it('保存に失敗したら、エラーを表示し、下書きは残り、「未保存」のままである', async () => {
    seedChapters()
    server.use(
      http.patch(
        '/api/chapters/:id',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')

    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '保存できませんでした',
    )
    expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界！')
    expect(screen.getByRole('status')).toHaveTextContent(
      '未保存の変更があります',
    )
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    expect(readDb().chapters[1].body).toBe('こんにちは\n世界')
  })

  it('保存に失敗したあと、入力を元に戻して「保存済み」になったら、エラー表示は消える', async () => {
    seedChapters()
    server.use(
      http.patch(
        '/api/chapters/:id',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '保存できませんでした',
    )

    await user.type(screen.getByLabelText('本文'), '{Backspace}')

    expect(screen.getByRole('status')).toHaveTextContent('保存済み')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('失敗のあとにもう一度保存して成功すると、エラーが消え、「保存済み」になる', async () => {
    seedChapters()
    server.use(
      http.patch(
        '/api/chapters/:id',
        () => new HttpResponse(null, { status: 500 }),
        { once: true },
      ),
    )
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('保存済み'),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(readDb().chapters[1].body).toBe('こんにちは\n世界！')
  })

  it('保存している間は、保存ボタンが無効になる', async () => {
    seedChapters()
    // 応答を保留にして、保存が進行中の状態を作る
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.patch('/api/chapters/:id', async () => {
        await gate
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')

    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeDisabled(),
    )
    release()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeEnabled(),
    )
  })

  it('localStorage に書き込めなくて保存に失敗しても、下書きは残る', async () => {
    seedChapters()
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')
    // 容量超過(QuotaExceededError)を再現する。読み込みはそのまま通し、保存の書き込みだけ失敗させる
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError')
      })

    try {
      await user.click(screen.getByRole('button', { name: '保存' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        '保存できませんでした',
      )
      expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界！')
      expect(screen.getByRole('status')).toHaveTextContent(
        '未保存の変更があります',
      )
    } finally {
      setItem.mockRestore()
    }
    expect(readDb().chapters[1].body).toBe('こんにちは\n世界')
  })
})

describe('ChapterEditor の戻る', () => {
  const message = '未保存の変更があります。破棄して戻りますか?'

  it('未保存でなければ、確認せずに戻る', async () => {
    seedChapters()
    const confirm = vi.spyOn(window, 'confirm')
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderEditor('c2', onBack)

    try {
      await user.click(
        await screen.findByRole('button', { name: '章の一覧に戻る' }),
      )

      expect(confirm).not.toHaveBeenCalled()
      expect(onBack).toHaveBeenCalledTimes(1)
    } finally {
      confirm.mockRestore()
    }
  })

  it('未保存で、確認をキャンセルしたら、戻らず、下書きが残る', async () => {
    seedChapters()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderEditor('c2', onBack)
    await user.type(await screen.findByLabelText('本文'), '！')

    try {
      await user.click(screen.getByRole('button', { name: '章の一覧に戻る' }))

      expect(confirm).toHaveBeenCalledTimes(1)
      expect(confirm).toHaveBeenCalledWith(message)
      expect(onBack).not.toHaveBeenCalled()
      expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界！')
    } finally {
      confirm.mockRestore()
    }
  })

  it('未保存で、確認を OK にしたら、戻る', async () => {
    seedChapters()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderEditor('c2', onBack)
    await user.type(await screen.findByLabelText('本文'), '！')

    try {
      await user.click(screen.getByRole('button', { name: '章の一覧に戻る' }))

      expect(confirm).toHaveBeenCalledWith(message)
      expect(onBack).toHaveBeenCalledTimes(1)
    } finally {
      confirm.mockRestore()
    }
    // 破棄して戻るだけで、保存はされない
    expect(readDb().chapters[1].body).toBe('こんにちは\n世界')
  })

  it('保存したあとは、確認せずに戻る', async () => {
    seedChapters()
    const confirm = vi.spyOn(window, 'confirm')
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderEditor('c2', onBack)
    await user.type(await screen.findByLabelText('本文'), '！')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('保存済み'),
    )

    try {
      await user.click(screen.getByRole('button', { name: '章の一覧に戻る' }))

      expect(confirm).not.toHaveBeenCalled()
      expect(onBack).toHaveBeenCalledTimes(1)
    } finally {
      confirm.mockRestore()
    }
  })

  it('保存に失敗して未保存のままなら、確認してから戻る', async () => {
    seedChapters()
    server.use(
      http.patch(
        '/api/chapters/:id',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderEditor('c2', onBack)
    await user.type(await screen.findByLabelText('本文'), '！')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    try {
      await user.click(screen.getByRole('button', { name: '章の一覧に戻る' }))

      expect(confirm).toHaveBeenCalledTimes(1)
      expect(onBack).not.toHaveBeenCalled()
    } finally {
      confirm.mockRestore()
    }
  })
})

describe('ChapterEditor の再取得(別のタブから戻ったとき)', () => {
  // ブラウザのタブに戻ると、TanStack Query は(古い扱いの)データを取り直す。
  // 編集中に本文が差し替わったり、取得の失敗でエディタが消えたりしてはいけない
  function returnToTab() {
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
  }
  // 取り直しが起きるなら、その結果が画面に出るまで待つ
  const settle = () => new Promise((resolve) => setTimeout(resolve, 100))

  function countGets() {
    const urls: string[] = []
    const onStart = ({ request }: { request: Request }) => {
      if (request.method === 'GET') urls.push(new URL(request.url).pathname)
    }
    server.events.on('request:start', onStart)
    return {
      chapterGets: () =>
        urls.filter((path) => path === '/api/chapters/c2').length,
      stop: () => server.events.removeListener('request:start', onStart),
    }
  }

  it('戻ったときの取り直しが失敗しても、エディタと下書きは消えない', async () => {
    seedChapters()
    const gets = countGets()
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')

    try {
      server.use(
        http.get(
          '/api/chapters/:id',
          () => new HttpResponse(null, { status: 500 }),
        ),
      )
      returnToTab()
      await settle()

      expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界！')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(gets.chapterGets()).toBe(1)
    } finally {
      gets.stop()
    }
  })

  it('別のタブで保存されても、戻ったときに「未保存」と出ない(取り直さない)', async () => {
    seedChapters()
    const gets = countGets()
    renderEditor('c2')
    expect(await screen.findByLabelText('本文')).toHaveValue('こんにちは\n世界')

    try {
      // 別のタブで、同じ章の本文が保存された状況
      seedDb({
        works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')],
        chapters: [
          makeChapter('c1', 'w1', '別の作品の章', '別の作品の本文'),
          makeChapter('c2', 'w2', '開く章', '別のタブで保存された本文'),
          makeChapter('c3', 'w2', '次の章', '次の章の本文'),
        ],
      })
      returnToTab()
      await settle()

      expect(screen.getByRole('status')).toHaveTextContent('保存済み')
      expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界')
      expect(gets.chapterGets()).toBe(1)
    } finally {
      gets.stop()
    }
  })

  it('別のタブで章が消されても、戻ったときに下書きは消えず、保存は失敗として知らせる', async () => {
    seedChapters()
    const user = userEvent.setup()
    renderEditor('c2')
    await user.type(await screen.findByLabelText('本文'), '！')

    // 別のタブで、この章が削除された状況
    seedDb({
      works: [makeWork('w1', '作品1'), makeWork('w2', '作品2')],
      chapters: [
        makeChapter('c1', 'w1', '別の作品の章', '別の作品の本文'),
        makeChapter('c3', 'w2', '次の章', '次の章の本文'),
      ],
    })
    returnToTab()
    await settle()

    expect(screen.queryByText('章が見つかりません')).not.toBeInTheDocument()
    expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界！')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '保存できませんでした',
    )
    expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界！')
  })
})

describe('ChapterEditor の保存のあとの書き足し', () => {
  // 1 回目の保存だけを、応答を保留にできる偽のハンドラにする(2 回目は本物のハンドラに任せる)。
  // 本物と同じく、保存先を更新して、更新後の章を返す
  function holdFirstSave() {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.patch(
        '/api/chapters/:id',
        async ({ params, request }) => {
          const sent: unknown = await request.json()
          if (
            typeof sent !== 'object' ||
            sent === null ||
            !('body' in sent) ||
            typeof sent.body !== 'string'
          ) {
            throw new Error('本文が送られていない(テストの準備の誤り)')
          }
          const { body } = sent
          await gate
          const db = readDb()
          const current = db.chapters.find(
            (chapter) => chapter.id === params.id,
          )
          if (!current) throw new Error('章が無い(テストの準備の誤り)')
          const updated = {
            ...current,
            body,
            updatedAt: new Date().toISOString(),
          }
          seedDb({
            works: db.works,
            chapters: db.chapters.map((chapter) =>
              chapter.id === updated.id ? updated : chapter,
            ),
          })
          return HttpResponse.json(updated)
        },
        { once: true },
      ),
    )
    return release
  }

  it('保存の応答を待つ間に書き足しても、書き足した分は消えず、もう一度保存すると保存される', async () => {
    seedChapters()
    const release = holdFirstSave()
    const user = userEvent.setup()
    renderEditor('c2')
    const textarea = await screen.findByLabelText('本文')
    await user.type(textarea, 'A')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeDisabled(),
    )

    // 保存の応答を待っている間に、書き足す
    await user.type(textarea, 'B')
    release()

    // 応答が返っても、書き足した「B」は下書きに残り、まだ未保存
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeEnabled(),
    )
    expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界AB')
    expect(screen.getByRole('status')).toHaveTextContent(
      '未保存の変更があります',
    )
    // 1 回目に保存されたのは、クリックしたときの本文(「B」は含まない)
    expect(readDb().chapters[1].body).toBe('こんにちは\n世界A')

    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('保存済み'),
    )
    expect(screen.getByLabelText('本文')).toHaveValue('こんにちは\n世界AB')
    expect(readDb().chapters[1].body).toBe('こんにちは\n世界AB')
  })

  it('保存が済んだあとに書き足すと「未保存」になり、もう一度保存すると書き足した本文が保存される', async () => {
    seedChapters()
    const user = userEvent.setup()
    renderEditor('c2')
    const textarea = await screen.findByLabelText('本文')
    await user.type(textarea, 'A')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('保存済み'),
    )

    await user.type(textarea, 'B')

    expect(screen.getByRole('status')).toHaveTextContent(
      '未保存の変更があります',
    )
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    expect(readDb().chapters[1].body).toBe('こんにちは\n世界A')

    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('保存済み'),
    )
    expect(readDb().chapters[1].body).toBe('こんにちは\n世界AB')
  })
})
