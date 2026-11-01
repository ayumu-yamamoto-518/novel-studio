import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Work } from '@/features/works/types'
import { readDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { seedDb } from '@/test/db'
import { renderWithClient } from '@/test/render'
import { ChapterForm } from './ChapterForm'
import { ChapterList } from './ChapterList'

const work: Work = {
  id: 'w2',
  title: '作品1',
  status: 'writing',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

function renderFormAndList() {
  return renderWithClient(
    <>
      <ChapterForm workId="w2" />
      <ChapterList workId="w2" />
    </>,
  )
}

describe('ChapterForm', () => {
  it('章のタイトルを入力して追加すると、一覧に出て、入力欄が空になる', async () => {
    seedDb({ works: [work] })
    const user = userEvent.setup()
    renderFormAndList()

    await user.type(screen.getByLabelText('章のタイトル'), '第一章')
    await user.click(screen.getByRole('button', { name: '章を追加' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent('第一章')
    expect(screen.getByLabelText('章のタイトル')).toHaveValue('')
    expect(screen.queryByText('章がありません')).not.toBeInTheDocument()
    expect(readDb().chapters.map((chapter) => chapter.workId)).toEqual(['w2'])
  })

  it('前後の空白を除いたタイトルで保存する', async () => {
    seedDb({ works: [work] })
    const user = userEvent.setup()
    renderFormAndList()

    await user.type(screen.getByLabelText('章のタイトル'), '  余白のある章  ')
    await user.click(screen.getByRole('button', { name: '章を追加' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent(
      '余白のある章',
    )
    expect(readDb().chapters.map((chapter) => chapter.title)).toEqual([
      '余白のある章',
    ])
  })

  it('空のまま追加すると、検証メッセージを表示し、何も作らない', async () => {
    seedDb({ works: [work] })
    const user = userEvent.setup()
    renderFormAndList()

    await user.click(screen.getByRole('button', { name: '章を追加' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タイトルを入力してください',
    )
    expect(readDb().chapters).toEqual([])
  })

  it('空白だけのタイトルは、検証メッセージを表示し、入力を残す', async () => {
    seedDb({ works: [work] })
    const user = userEvent.setup()
    renderFormAndList()

    await user.type(screen.getByLabelText('章のタイトル'), '   ')
    await user.click(screen.getByRole('button', { name: '章を追加' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タイトルを入力してください',
    )
    expect(screen.getByLabelText('章のタイトル')).toHaveValue('   ')
    expect(readDb().chapters).toEqual([])
  })

  it('101文字のタイトルは、検証メッセージを表示し、入力を残す', async () => {
    seedDb({ works: [work] })
    const user = userEvent.setup()
    renderFormAndList()
    const title = 'あ'.repeat(101)

    await user.click(screen.getByLabelText('章のタイトル'))
    await user.paste(title)
    await user.click(screen.getByRole('button', { name: '章を追加' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タイトルは100文字以内で入力してください',
    )
    expect(screen.getByLabelText('章のタイトル')).toHaveValue(title)
    expect(readDb().chapters).toEqual([])
  })

  it('検証エラーの後に追加に成功すると、エラーが消える', async () => {
    seedDb({ works: [work] })
    const user = userEvent.setup()
    renderFormAndList()
    await user.click(screen.getByRole('button', { name: '章を追加' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.type(screen.getByLabelText('章のタイトル'), '直した章')
    await user.click(screen.getByRole('button', { name: '章を追加' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent('直した章')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ダブルクリックしても、章は1件だけ作られる', async () => {
    seedDb({ works: [work] })
    // 1回目の完了を待つ間に2回目が保存前でも見逃さないよう、送信された回数を直接数える
    const posted: string[] = []
    const onRequestStart = ({ request }: { request: Request }) => {
      if (request.method === 'POST') posted.push(request.url)
    }
    server.events.on('request:start', onRequestStart)
    // 既定では操作の間に待ちが入り、1回目の応答が先に返ってしまう。
    // 応答が返る前に2回目のクリックが来る状況にするため、待ちをなくす
    const user = userEvent.setup({ delay: null })
    renderFormAndList()

    try {
      await user.type(screen.getByLabelText('章のタイトル'), '一度だけ')
      await user.dblClick(screen.getByRole('button', { name: '章を追加' }))

      expect(await screen.findByRole('listitem')).toHaveTextContent('一度だけ')
      expect(posted).toHaveLength(1)
      expect(readDb().chapters).toHaveLength(1)
    } finally {
      server.events.removeListener('request:start', onRequestStart)
    }
  })

  it('追加に失敗したら、エラーを表示し、入力を残す', async () => {
    seedDb({ works: [work] })
    server.use(
      http.post(
        '/api/works/:workId/chapters',
        () => new HttpResponse(null, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderFormAndList()

    await user.type(screen.getByLabelText('章のタイトル'), '失敗する章')
    await user.click(screen.getByRole('button', { name: '章を追加' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '章を追加できませんでした',
    )
    expect(screen.getByLabelText('章のタイトル')).toHaveValue('失敗する章')
  })
})
