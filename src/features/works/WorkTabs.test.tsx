import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { writeDb } from '@/mocks/db'
import { renderWithClient } from '@/test/render'
import type { Work } from './types'
import { WorkTabs } from './WorkTabs'

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
    writeDb({
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
    writeDb({
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
    writeDb({
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
    writeDb({ works: [makeWork('w1', '移る作品', 'writing')] })
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

  // 直前のテストが「完了」タブを選んだまま終わる。選択が次のテストへ漏れないことを確かめる
  // (render の Provider を外すと、ここが失敗する)
  it('選択したタブは、次のテストに引き継がれない(初期は「執筆中」)', () => {
    renderWithClient(<WorkTabs />)

    expect(screen.getByRole('tab', { name: '執筆中' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
