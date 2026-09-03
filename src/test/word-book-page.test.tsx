import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_DASHBOARD, type DashboardSummary, type WordMemory } from '../core/models'
import { WordBookPage } from '../pages/WordBookPage'

const audioSettings = { muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }

const wordMemory: WordMemory[] = [
  { wordId: 'exp-friend', text: 'friend', meaning: '朋友', completedCount: 1, mistakeCount: 3, cleanStreak: 0, lastPracticedAt: 1_788_400_000_000, lastMistakeAt: 1_788_400_000_000, needsReview: true },
  { wordId: 'exp-green', text: 'green', meaning: '绿色', completedCount: 3, mistakeCount: 2, cleanStreak: 1, lastPracticedAt: 1_788_500_000_000, lastMistakeAt: 1_788_300_000_000, needsReview: true },
  { wordId: 'exp-school', text: 'school', meaning: '学校', completedCount: 2, mistakeCount: 1, cleanStreak: 0, lastPracticedAt: 1_788_200_000_000, lastMistakeAt: 1_788_200_000_000, needsReview: true },
  { wordId: 'exp-book', text: 'book', meaning: '书', completedCount: 6, mistakeCount: 1, cleanStreak: 4, lastPracticedAt: 1_788_600_000_000, lastMistakeAt: 1_788_000_000_000, needsReview: false },
]

const summary: DashboardSummary = {
  ...EMPTY_DASHBOARD,
  masteredWords: 4,
  wrongWordCount: 3,
  wordMemory,
}

function renderWordBook(overrides: Partial<React.ComponentProps<typeof WordBookPage>> = {}) {
  const navigate = vi.fn()
  const toggleAudio = vi.fn()
  render(
    <WordBookPage
      summary={summary}
      audioSettings={audioSettings}
      navigate={navigate}
      toggleAudio={toggleAudio}
      {...overrides}
    />,
  )
  return { navigate, toggleAudio }
}

describe('WordBookPage', () => {
  it('shows a three-word child route and launches shared mixed review', () => {
    const { navigate, toggleAudio } = renderWordBook()
    const route = screen.getByLabelText('待复习单词路线')

    expect(within(route).getByText('friend')).toBeInTheDocument()
    expect(within(route).getByText('school')).toBeInTheDocument()
    expect(within(route).getByText('green')).toBeInTheDocument()
    expect(within(route).getByText('再答对一次')).toBeInTheDocument()
    expect(screen.queryByText('3 次')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '复习路线开花进度' })).toHaveAttribute('aria-valuenow', '17')

    fireEvent.click(screen.getByRole('button', { name: /开始混合复习/ }))
    expect(navigate).toHaveBeenCalledWith('frog')
    fireEvent.click(screen.getByRole('button', { name: '冒险地图' }))
    expect(navigate).toHaveBeenCalledWith('home')
    fireEvent.click(screen.getByRole('button', { name: '家长中心' }))
    expect(navigate).toHaveBeenCalledWith('parent')
    fireEvent.click(screen.getByRole('button', { name: '关闭声音' }))
    expect(toggleAudio).toHaveBeenCalledOnce()
  })

  it('keeps error counts in an expandable parent detail layer', () => {
    renderWordBook()
    const toggle = screen.getByRole('button', { name: /查看家长明细/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: /收起家长明细/ })).toHaveAttribute('aria-expanded', 'true')
    const table = screen.getByRole('table')
    const friendRow = within(table).getByRole('row', { name: /friend/ })
    expect(within(friendRow).getByRole('rowheader', { name: /friend/ })).toBeInTheDocument()
    expect(within(friendRow).getByText('3 次')).toBeInTheDocument()
    expect(within(table).getAllByText('待复习')).toHaveLength(3)
    expect(within(table).getByText('已稳定')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /收起家长明细/ }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a positive empty state and supports muted audio', () => {
    const navigate = vi.fn()
    const toggleAudio = vi.fn()
    renderWordBook({
      summary: EMPTY_DASHBOARD,
      audioSettings: { ...audioSettings, muted: true },
      navigate,
      toggleAudio,
    })

    expect(screen.getByRole('heading', { name: '今天没有待复习词' })).toBeInTheDocument()
    expect(screen.getByText('0 个词')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /去发现新单词/ }))
    expect(navigate).toHaveBeenCalledWith('frog')
    fireEvent.click(screen.getByRole('button', { name: '打开声音' }))
    expect(toggleAudio).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /查看家长明细/ }))
    expect(screen.getByText(/完成第一局后/)).toBeInTheDocument()
  })
})
