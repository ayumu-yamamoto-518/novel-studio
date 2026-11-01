import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAtomValue } from 'jotai'
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { seedDb } from '@/test/db'
import { server } from '@/mocks/server'
import { renderWithClient } from '@/test/render'
import { selectedWorkIdAtom } from './state'
import type { Work } from './types'
import { WorkTabs } from './WorkTabs'

// 選択中の作品(selectedWorkIdAtom)を、画面に出して確かめるためのテスト用の部品
function SelectedWorkProbe() {
  const id = useAtomValue(selectedWorkIdAtom)
  return <p>選択中: {id ?? 'なし'}</p>
}

function makeWork(id: string, title: string, status: Work['status']): Work {
  return {
    id,
    title,
    status,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

describe('WorkTabs', () => {
  it('「執筆中」と「完了」の2つのタブを表示し、初期は「執筆中」が選ばれている', () => {
    renderWithClient(<WorkTabs />)

    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: '執筆中' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: '完了' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('初期は、執筆中の作品だけを表示する', async () => {
    seedDb({
      works: [
        makeWork('w1', '執筆中の作品', 'writing'),
        makeWork('w2', '完了した作品', 'completed'),
      ],
    })

    renderWithClient(<WorkTabs />)

    expect(await screen.findByText('執筆中の作品')).toBeInTheDocument()
    expect(screen.queryByText('完了した作品')).not.toBeInTheDocument()
  })

  it('「完了」を押すと、完了の作品だけを表示する', async () => {
    seedDb({
      works: [
        makeWork('w1', '執筆中の作品', 'writing'),
        makeWork('w2', '完了した作品', 'completed'),
      ],
    })
    const user = userEvent.setup()
    renderWithClient(<WorkTabs />)

    await user.click(screen.getByRole('tab', { name: '完了' }))

    expect(await screen.findByText('完了した作品')).toBeInTheDocument()
    expect(screen.queryByText('執筆中の作品')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '完了' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('「執筆中」に戻すと、執筆中の作品だけを表示する', async () => {
    seedDb({
      works: [
        makeWork('w1', '執筆中の作品', 'writing'),
        makeWork('w2', '完了した作品', 'completed'),
      ],
    })
    const user = userEvent.setup()
    renderWithClient(<WorkTabs />)

    await user.click(screen.getByRole('tab', { name: '完了' }))
    await screen.findByText('完了した作品')
    await user.click(screen.getByRole('tab', { name: '執筆中' }))

    expect(await screen.findByText('執筆中の作品')).toBeInTheDocument()
    expect(screen.queryByText('完了した作品')).not.toBeInTheDocument()
  })

  it('作品を完了にしてから「完了」タブを開くと、そこに移っている', async () => {
    seedDb({ works: [makeWork('w1', '移る作品', 'writing')] })
    const user = userEvent.setup()
    renderWithClient(<WorkTabs />)

    await user.click(
      await screen.findByRole('button', { name: '「移る作品」を完了にする' }),
    )
    await waitFor(() =>
      expect(screen.queryByText('移る作品')).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('tab', { name: '完了' }))

    expect(await screen.findByText('移る作品')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '「移る作品」を執筆中に戻す' }),
    ).toBeInTheDocument()
  })

  it('変更の失敗によるエラー表示は、別のタブへ移っても残らない', async () => {
    seedDb({
      works: [
        makeWork('w1', '失敗する作品', 'writing'),
        makeWork('w2', '完了した作品', 'completed'),
      ],
    })
    server.use(
      http.patch(
        '/api/works/:id',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderWithClient(<WorkTabs />)
    await user.click(
      await screen.findByRole('button', {
        name: '「失敗する作品」を完了にする',
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ステータスを変更できませんでした',
    )

    await user.click(screen.getByRole('tab', { name: '完了' }))

    expect(await screen.findByText('完了した作品')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('タブごとに、空の状態の文言が違う', async () => {
    const user = userEvent.setup()
    renderWithClient(<WorkTabs />)
    expect(
      await screen.findByText('執筆中の作品がありません'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '完了' }))

    expect(
      await screen.findByText('完了した作品がありません'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('執筆中の作品がありません'),
    ).not.toBeInTheDocument()
  })

  // 他のテストの順序に頼らず、この1つで完結させる。
  // render の Provider を外すと、選択が次の render に残るので失敗する
  it('作品名を押すと、その作品が選択される(対象は中間。「完了」タブの作品でも同じ)', async () => {
    seedDb({
      works: [
        makeWork('w1', '最初の作品', 'completed'),
        makeWork('w2', '中間の作品', 'completed'),
        makeWork('w3', '最後の作品', 'completed'),
      ],
    })
    const user = userEvent.setup()
    renderWithClient(
      <>
        <WorkTabs />
        <SelectedWorkProbe />
      </>,
    )
    expect(screen.getByText('選択中: なし')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '完了' }))
    await user.click(await screen.findByRole('button', { name: '中間の作品' }))

    expect(screen.getByText('選択中: w2')).toBeInTheDocument()
  })

  it('選択したタブは、描画し直すと引き継がれない(render ごとに新しい store)', async () => {
    const user = userEvent.setup()
    const first = renderWithClient(<WorkTabs />)
    await user.click(screen.getByRole('tab', { name: '完了' }))
    expect(screen.getByRole('tab', { name: '完了' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    first.unmount()

    renderWithClient(<WorkTabs />)

    expect(screen.getByRole('tab', { name: '執筆中' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
