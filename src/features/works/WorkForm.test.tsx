import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { readDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { renderWithClient } from '@/test/render'
import { WorkForm } from './WorkForm'
import { WorkList } from './WorkList'
import { WorkTabs } from './WorkTabs'

function renderFormAndList() {
  return renderWithClient(
    <>
      <WorkForm />
      <WorkList status="writing" onOpen={() => {}} />
    </>,
  )
}

describe('WorkForm', () => {
  it('タイトルを入力して作成すると、一覧に出て、入力欄が空になる', async () => {
    const user = userEvent.setup()
    renderFormAndList()

    await user.type(screen.getByLabelText('タイトル'), '吾輩は猫である')
    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent(
      '吾輩は猫である',
    )
    expect(screen.getByLabelText('タイトル')).toHaveValue('')
    expect(
      screen.queryByText('執筆中の作品がありません'),
    ).not.toBeInTheDocument()
  })

  it('空のまま作成すると、検証メッセージを表示し、何も作らない', async () => {
    const user = userEvent.setup()
    renderFormAndList()

    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タイトルを入力してください',
    )
    expect(readDb().works).toEqual([])
  })

  it('空白だけのタイトルは、検証メッセージを表示し、入力を残す', async () => {
    const user = userEvent.setup()
    renderFormAndList()

    await user.type(screen.getByLabelText('タイトル'), '   ')
    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タイトルを入力してください',
    )
    expect(screen.getByLabelText('タイトル')).toHaveValue('   ')
    expect(readDb().works).toEqual([])
  })

  it('101文字のタイトルは、検証メッセージを表示し、入力を残す', async () => {
    const user = userEvent.setup()
    renderFormAndList()
    const title = 'あ'.repeat(101)

    await user.click(screen.getByLabelText('タイトル'))
    await user.paste(title)
    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'タイトルは100文字以内で入力してください',
    )
    expect(screen.getByLabelText('タイトル')).toHaveValue(title)
    expect(readDb().works).toEqual([])
  })

  it('前後の空白を除いたタイトルで保存する', async () => {
    const user = userEvent.setup()
    renderFormAndList()

    await user.type(screen.getByLabelText('タイトル'), '  余白のある作品  ')
    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent(
      '余白のある作品',
    )
    expect(readDb().works.map((work) => work.title)).toEqual(['余白のある作品'])
  })

  it('検証エラーの後に作成に成功すると、エラーが消える', async () => {
    const user = userEvent.setup()
    renderFormAndList()

    await user.click(screen.getByRole('button', { name: '作成' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.type(screen.getByLabelText('タイトル'), '直した作品')
    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent('直した作品')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ダブルクリックしても、作品は1件だけ作られる', async () => {
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
      await user.type(screen.getByLabelText('タイトル'), '一度だけ')
      await user.dblClick(screen.getByRole('button', { name: '作成' }))

      expect(await screen.findByRole('listitem')).toHaveTextContent('一度だけ')
      expect(posted).toHaveLength(1)
      expect(readDb().works).toHaveLength(1)
    } finally {
      server.events.removeListener('request:start', onRequestStart)
    }
  })

  it('作成に失敗したら、エラーを表示し、入力を残す', async () => {
    server.use(
      http.post('/api/works', () => new HttpResponse(null, { status: 500 })),
    )
    const user = userEvent.setup()
    renderFormAndList()

    await user.type(screen.getByLabelText('タイトル'), '失敗する作品')
    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '作品を作成できませんでした',
    )
    expect(screen.getByLabelText('タイトル')).toHaveValue('失敗する作品')
  })
})

describe('WorkForm とタブ', () => {
  function renderFormAndTabs() {
    return renderWithClient(
      <>
        <WorkForm />
        <WorkTabs />
      </>,
    )
  }

  it('「完了」タブを見ている間に作成すると、「執筆中」タブに切り替わり、作った作品が見える', async () => {
    const user = userEvent.setup()
    renderFormAndTabs()
    await user.click(screen.getByRole('tab', { name: '完了' }))
    expect(
      await screen.findByText('完了した作品がありません'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('タイトル'), '新しい作品')
    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByText('新しい作品')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '執筆中' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('作成に失敗したときは、見ているタブを切り替えない', async () => {
    server.use(
      http.post('/api/works', () => new HttpResponse(null, { status: 500 })),
    )
    const user = userEvent.setup()
    renderFormAndTabs()
    await user.click(screen.getByRole('tab', { name: '完了' }))

    await user.type(screen.getByLabelText('タイトル'), '失敗する作品')
    await user.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '完了' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
