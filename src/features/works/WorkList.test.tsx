import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { readDb, writeDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { renderWithClient } from '@/test/render'
import type { Work } from './types'
import { WorkList } from './WorkList'

function makeWork(
  id: string,
  title: string,
  status: Work['status'] = 'writing',
): Work {
  return {
    id,
    title,
    status,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

describe('WorkList', () => {
  it('読み込み中は、その旨を表示する', () => {
    renderWithClient(<WorkList status="writing" />)

    expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  })

  it('作品が0件なら、空の状態を表示する', async () => {
    renderWithClient(<WorkList status="writing" />)

    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('作品のタイトルを、新しい順に表示する', async () => {
    writeDb({
      works: [makeWork('w1', '古い作品'), makeWork('w2', '新しい作品')],
    })

    renderWithClient(<WorkList status="writing" />)

    const items = await screen.findAllByRole('listitem')
    expect(
      items.map((item) => within(item).getByText(/作品/).textContent),
    ).toEqual(['新しい作品', '古い作品'])
    expect(
      screen.queryByText('執筆中の作品がありません'),
    ).not.toBeInTheDocument()
  })

  it('読み込みに失敗したら、エラーを表示する', async () => {
    server.use(
      http.get('/api/works', () => new HttpResponse(null, { status: 500 })),
    )

    renderWithClient(<WorkList status="writing" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '作品を読み込めませんでした',
    )
    expect(
      screen.queryByText('執筆中の作品がありません'),
    ).not.toBeInTheDocument()
  })
})

describe('WorkList のステータス別表示', () => {
  const works = [
    makeWork('w1', '執筆中の作品A', 'writing'),
    makeWork('w2', '完了した作品A', 'completed'),
    makeWork('w3', '執筆中の作品B', 'writing'),
    makeWork('w4', '完了した作品B', 'completed'),
  ]

  it('writing を渡すと、執筆中の作品だけを表示する', async () => {
    writeDb({ works })

    renderWithClient(<WorkList status="writing" />)

    const items = await screen.findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('執筆中の作品B'),
      expect.stringContaining('執筆中の作品A'),
    ])
    expect(screen.queryByText(/完了した作品/)).not.toBeInTheDocument()
  })

  it('completed を渡すと、完了の作品だけを表示する', async () => {
    writeDb({ works })

    renderWithClient(<WorkList status="completed" />)

    const items = await screen.findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('完了した作品B'),
      expect.stringContaining('完了した作品A'),
    ])
    expect(screen.queryByText(/執筆中の作品/)).not.toBeInTheDocument()
  })

  it('完了の作品がなければ、完了用の空の状態を表示する', async () => {
    writeDb({ works: [makeWork('w1', '執筆中だけの作品', 'writing')] })

    renderWithClient(<WorkList status="completed" />)

    expect(
      await screen.findByText('完了した作品がありません'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('執筆中の作品がありません'),
    ).not.toBeInTheDocument()
  })

  it('執筆中の作品がなければ、完了の作品があっても、執筆中用の空の状態を表示する', async () => {
    writeDb({ works: [makeWork('w1', '完了だけの作品', 'completed')] })

    renderWithClient(<WorkList status="writing" />)

    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()
    expect(screen.queryByText('完了だけの作品')).not.toBeInTheDocument()
  })
})

describe('WorkList のステータス変更', () => {
  it('ボタンの名前は、執筆中の一覧では「完了にする」、完了の一覧では「執筆中に戻す」になる', async () => {
    writeDb({
      works: [makeWork('w1', 'A', 'writing'), makeWork('w2', 'B', 'completed')],
    })

    const writing = renderWithClient(<WorkList status="writing" />)
    expect(
      await screen.findByRole('button', { name: '「A」を完了にする' }),
    ).toBeInTheDocument()
    writing.unmount()

    renderWithClient(<WorkList status="completed" />)
    expect(
      await screen.findByRole('button', { name: '「B」を執筆中に戻す' }),
    ).toBeInTheDocument()
  })

  it('「完了にする」を押すと、その作品だけが執筆中の一覧から消え、保存される', async () => {
    writeDb({
      // タイトルをボタンの表示文言(「完了にする」)と同じにすると、text の検索が衝突する
      works: [makeWork('w1', '残る'), makeWork('w2', '移す作品')],
    })
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)

    await user.click(
      await screen.findByRole('button', { name: '「移す作品」を完了にする' }),
    )

    await waitFor(() =>
      expect(screen.queryByText('移す作品')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('残る')).toBeInTheDocument()
    expect(readDb().works.map((work) => work.status)).toEqual([
      'writing',
      'completed',
    ])
  })

  it('完了の一覧で「執筆中に戻す」を押すと、その作品が完了の一覧から消え、保存される', async () => {
    writeDb({
      works: [
        makeWork('w1', '残る', 'completed'),
        makeWork('w2', '戻す', 'completed'),
      ],
    })
    const user = userEvent.setup()
    renderWithClient(<WorkList status="completed" />)

    await user.click(
      await screen.findByRole('button', { name: '「戻す」を執筆中に戻す' }),
    )

    await waitFor(() =>
      expect(screen.queryByText('戻す')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('残る')).toBeInTheDocument()
    expect(readDb().works.map((work) => work.status)).toEqual([
      'completed',
      'writing',
    ])
  })

  it('変更に失敗したら、エラーを表示し、作品は残る', async () => {
    writeDb({ works: [makeWork('w1', '変わらない作品')] })
    server.use(
      http.patch(
        '/api/works/:id',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)

    await user.click(
      await screen.findByRole('button', {
        name: '「変わらない作品」を完了にする',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ステータスを変更できませんでした',
    )
    expect(screen.getByText('変わらない作品')).toBeInTheDocument()
    expect(readDb().works[0].status).toBe('writing')
  })

  it('既に消えた作品の変更は、エラーを表示し、取り直して一覧から消える', async () => {
    const stay = makeWork('w2', 'ずっと残る作品')
    writeDb({ works: [makeWork('w1', '別の画面で消えた作品'), stay] })
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)
    const button = await screen.findByRole('button', {
      name: '「別の画面で消えた作品」を完了にする',
    })
    // 画面の外(別のタブなど)で、先に消えた状況を作る
    writeDb({ works: [stay] })

    await user.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ステータスを変更できませんでした',
    )
    await waitFor(() =>
      expect(
        screen.queryByText('別の画面で消えた作品'),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByText('ずっと残る作品')).toBeInTheDocument()
  })

  it('ダブルクリックしても、エラーを出さずに移る', async () => {
    // 確かめるのは送信回数ではなく結果。同じ値の PATCH は2回送っても結果が同じ。
    // 別の作品を残す理由は、削除のテストと同じ(空になるとエラーが描画されない)
    writeDb({
      works: [makeWork('w1', '二度押す作品'), makeWork('w2', 'ずっと残る作品')],
    })
    const user = userEvent.setup({ delay: null })
    renderWithClient(<WorkList status="writing" />)

    await user.dblClick(
      await screen.findByRole('button', {
        name: '「二度押す作品」を完了にする',
      }),
    )

    await waitFor(() =>
      expect(screen.queryByText('二度押す作品')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('ずっと残る作品')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(readDb().works.map((work) => work.status)).toEqual([
      'completed',
      'writing',
    ])
  })
})

describe('WorkList の操作中の無効化', () => {
  // 応答を保留にして、操作が進行中の状態を作る
  function gate() {
    let release!: () => void
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    return { promise, release }
  }

  it('ステータスを変更している間は、すべての行の「変更」と「削除」が無効になる', async () => {
    writeDb({ works: [makeWork('w1', 'A'), makeWork('w2', 'B')] })
    const { promise, release } = gate()
    server.use(
      http.patch('/api/works/:id', async () => {
        await promise
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)

    await user.click(
      await screen.findByRole('button', { name: '「A」を完了にする' }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '「B」を完了にする' }),
      ).toBeDisabled(),
    )
    expect(screen.getByRole('button', { name: '「B」を削除' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '「A」を削除' })).toBeDisabled()

    release()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '「B」を完了にする' }),
      ).toBeEnabled(),
    )
  })

  it('削除している間は、すべての行の「変更」と「削除」が無効になる', async () => {
    writeDb({ works: [makeWork('w1', 'A'), makeWork('w2', 'B')] })
    const { promise, release } = gate()
    server.use(
      http.delete('/api/works/:id', async () => {
        await promise
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)

    await user.click(await screen.findByRole('button', { name: '「A」を削除' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '「B」を削除' }),
      ).toBeDisabled(),
    )
    expect(
      screen.getByRole('button', { name: '「B」を完了にする' }),
    ).toBeDisabled()

    release()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '「B」を削除' })).toBeEnabled(),
    )
  })
})

describe('WorkList の削除', () => {
  it('削除ボタンの名前にタイトルが入り、複数の作品が並んでも区別できる', async () => {
    writeDb({ works: [makeWork('w1', 'A'), makeWork('w2', 'B')] })

    renderWithClient(<WorkList status="writing" />)

    expect(
      await screen.findByRole('button', { name: '「A」を削除' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '「B」を削除' }),
    ).toBeInTheDocument()
  })

  it('「削除」を押すと、その作品だけが一覧から消える', async () => {
    writeDb({
      works: [
        makeWork('w1', '残る1'),
        makeWork('w2', '消す'),
        makeWork('w3', '残る2'),
      ],
    })
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)

    await user.click(
      await screen.findByRole('button', { name: '「消す」を削除' }),
    )

    await waitFor(() =>
      expect(screen.queryByText('消す')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('残る1')).toBeInTheDocument()
    expect(screen.getByText('残る2')).toBeInTheDocument()
    expect(readDb().works.map((work) => work.title)).toEqual(['残る1', '残る2'])
  })

  it('最後の1件を消すと、空の状態を表示する', async () => {
    writeDb({ works: [makeWork('w1', '最後の作品')] })
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)

    await user.click(
      await screen.findByRole('button', { name: '「最後の作品」を削除' }),
    )

    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()
  })

  it('削除に失敗したら、エラーを表示し、作品は残る', async () => {
    writeDb({ works: [makeWork('w1', '消えない作品')] })
    server.use(
      http.delete(
        '/api/works/:id',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)

    await user.click(
      await screen.findByRole('button', { name: '「消えない作品」を削除' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '作品を削除できませんでした',
    )
    expect(screen.getByText('消えない作品')).toBeInTheDocument()
  })

  it('既に消えている作品(404)は、エラーにせず、一覧から消える', async () => {
    // 別の作品を残しておく。一覧が空になると、エラーがあっても描画されず、
    // 「エラーを出していない」ことを確かめられなくなるため
    const stay = makeWork('w2', 'ずっと残る作品')
    writeDb({ works: [makeWork('w1', '別の画面で消えた作品'), stay] })
    const user = userEvent.setup()
    renderWithClient(<WorkList status="writing" />)
    const button = await screen.findByRole('button', {
      name: '「別の画面で消えた作品」を削除',
    })
    // 画面の外(別のタブなど)で、先に消えた状況を作る
    writeDb({ works: [stay] })

    await user.click(button)

    await waitFor(() =>
      expect(
        screen.queryByText('別の画面で消えた作品'),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByText('ずっと残る作品')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ダブルクリックしても、エラーを出さずに消える', async () => {
    // 確かめるのは送信回数ではなく結果。2回目は 404 になるが、成功として扱う
    // 別の作品を残す理由は、上の 404 のテストと同じ
    writeDb({
      works: [makeWork('w1', '二度押す作品'), makeWork('w2', 'ずっと残る作品')],
    })
    const user = userEvent.setup({ delay: null })
    renderWithClient(<WorkList status="writing" />)

    await user.dblClick(
      await screen.findByRole('button', { name: '「二度押す作品」を削除' }),
    )

    await waitFor(() =>
      expect(screen.queryByText('二度押す作品')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('ずっと残る作品')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
