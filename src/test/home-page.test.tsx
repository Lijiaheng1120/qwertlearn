import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_DASHBOARD, type RunResult } from '../core/models'
import { HomePage } from '../pages/HomePage'

describe('HomePage', () => {
  it('makes every learning and growth entrance discoverable', () => {
    const navigate = vi.fn()
    const { container } = render(
      <HomePage
        summary={EMPTY_DASHBOARD}
        audioSettings={{ muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }}
        navigate={navigate}
        toggleAudio={vi.fn()}
      />,
    )

    expect(container.querySelector('.progress-track i')).toHaveStyle({ width: '0%' })
    expect(screen.getByText('提示音与单词朗读')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /键盘训练营/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /青蛙跳荷叶/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /城市追踪战/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /词语花园连连看/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /字母小火车/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '我的单词本' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '成长奖励' })).toBeInTheDocument()
    expect(screen.getByText('你有 0 冒险积分')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /青蛙跳荷叶/ }))
    expect(navigate).toHaveBeenCalledWith('frog')
    fireEvent.click(screen.getByRole('button', { name: /词语花园连连看/ }))
    expect(navigate).toHaveBeenCalledWith('match')
    fireEvent.click(screen.getByRole('button', { name: /字母小火车/ }))
    expect(navigate).toHaveBeenCalledWith('spell')
    fireEvent.click(screen.getByRole('button', { name: '返回冒险地图' }))
    expect(navigate).toHaveBeenCalledWith('home')
    fireEvent.click(screen.getByRole('button', { name: '键位训练' }))
    expect(navigate).toHaveBeenCalledWith('training')
    fireEvent.click(screen.getByRole('button', { name: '我的单词本' }))
    expect(navigate).toHaveBeenCalledWith('wordbook')
    fireEvent.click(screen.getByRole('button', { name: '成长奖励' }))
    expect(navigate).toHaveBeenCalledWith('rewards')
    fireEvent.click(screen.getByRole('button', { name: /打开奖励柜/ }))
    expect(navigate).toHaveBeenCalledWith('rewards')
    fireEvent.click(screen.getByRole('button', { name: '学习记录' }))
    expect(navigate).toHaveBeenCalledWith('parent')
    fireEvent.click(screen.getByRole('button', { name: /键盘训练营/ }))
    expect(navigate).toHaveBeenCalledWith('training')
    fireEvent.click(screen.getByRole('button', { name: /我的单词本.*看看今天/ }))
    expect(navigate).toHaveBeenCalledWith('wordbook')
    for (const name of [/连续练习/, /我的进步/]) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(navigate).toHaveBeenCalledWith('parent')
    }
  })

  it('renders saved progress and wires profile, chase, and audio actions', () => {
    const run: RunResult = {
      id: 'chase-latest', gameId: 'chase', mode: 'copy', wordPackId: 'experience-grade-4',
      difficulty: 1, speedTier: 1, rulesVersion: '1.1.0', startedAt: 1_000, completedAt: 33_000,
      durationMs: 32_000, pausedMs: 0, completed: true, correctWords: 7, correctCharacters: 30,
      mistakes: 3, maxStreak: 5, score: 990, words: ['cat'], usedFullHints: true, remainingDistance: 0,
    }
    const navigate = vi.fn()
    const toggleAudio = vi.fn()
    const { container } = render(
      <HomePage
        summary={{
          ...EMPTY_DASHBOARD,
          masteredWords: 5,
          todayMinutes: 4,
          accuracy: 0.9,
          practiceDays: 3,
          bestChaseMs: 32_000,
          highestSpellStage: 3,
          recentRuns: [run],
        }}
        audioSettings={{ muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }}
        navigate={navigate}
        toggleAudio={toggleAudio}
      />,
    )

    expect(container.querySelector('.progress-track i')).toHaveStyle({ width: '50%' })
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('最佳 32 秒')).toBeInTheDocument()
    expect(screen.getByText('最高第 3 站')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '关闭声音' }))
    expect(toggleAudio).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /小探险家/ }))
    expect(navigate).toHaveBeenCalledWith('parent')
    fireEvent.click(screen.getByRole('button', { name: /城市追踪战/ }))
    expect(navigate).toHaveBeenCalledWith('chase')
  })
})
