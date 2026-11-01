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
