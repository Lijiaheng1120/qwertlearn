import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { audioService } from '../core/audio-service'
import { EMPTY_DASHBOARD, type RunResult } from '../core/models'
import { ParentDashboard } from '../pages/ParentDashboard'

describe('ParentDashboard', () => {
  it('opens the word book, keeps unfinished records disabled, and opens the real sound panel', () => {
    const navigate = vi.fn()
    const toggleAudio = vi.fn()
    render(
      <ParentDashboard
        summary={EMPTY_DASHBOARD}
        audioSettings={{ muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }}
        navigate={navigate}
        toggleAudio={toggleAudio}
      />,
    )

    const wordBookButton = screen.getByRole('button', { name: /我的单词本/ })
    expect(wordBookButton).toBeEnabled()
    fireEvent.click(wordBookButton)
    expect(navigate).toHaveBeenCalledWith('wordbook')
    expect(screen.getByRole('button', { name: /学习记录，开发中/ })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '声音设置' }))
    expect(document.getElementById('sound-settings')).toHaveFocus()
    expect(toggleAudio).not.toHaveBeenCalled()
    expect(screen.getByLabelText('提示音音量')).toBeInTheDocument()
  })

  it('renders saved progress and wires navigation, mute, and SFX volume controls', () => {
    const run: RunResult = {
      id: 'frog-latest', gameId: 'frog', mode: 'copy', wordPackId: 'experience-grade-4',
      difficulty: 1, speedTier: 1, rulesVersion: '1.1.0', startedAt: 1_000, completedAt: 61_000,
      durationMs: 60_000, pausedMs: 0, completed: true, correctWords: 4, correctCharacters: 20,
      mistakes: 5, maxStreak: 4, score: 500, words: ['cat', 'book'], usedFullHints: true,
    }
    const navigate = vi.fn()
    const toggleAudio = vi.fn()
    const setChannel = vi.spyOn(audioService, 'setChannel')
    render(
      <ParentDashboard
        summary={{
          ...EMPTY_DASHBOARD,
          masteredWords: 2,
          todayMinutes: 4,
          accuracy: 0.8,
          bestFrogStreak: 4,
          recentRuns: [run],
        }}
        audioSettings={{ muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }}
        navigate={navigate}
        toggleAudio={toggleAudio}
      />,
    )

    expect(screen.getByText('4 / 8 分钟')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('4', { selector: '.compact-stats strong' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /返回冒险地图/ }))
    expect(navigate).toHaveBeenCalledWith('home')
    fireEvent.click(screen.getByRole('button', { name: /继续青蛙跳荷叶/ }))
    expect(navigate).toHaveBeenCalledWith('frog')
    fireEvent.click(screen.getByRole('button', { name: '今日学习' }))
    expect(navigate).toHaveBeenCalledWith('parent')
    fireEvent.click(screen.getByRole('button', { name: /键盘训练营/ }))
    expect(navigate).toHaveBeenCalledWith('training')
    fireEvent.click(screen.getByRole('button', { name: /城市追踪战/ }))
    expect(navigate).toHaveBeenCalledWith('chase')
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(toggleAudio).toHaveBeenCalledOnce()
    fireEvent.change(screen.getByLabelText('提示音音量'), { target: { value: '0.4' } })
    expect(setChannel).toHaveBeenCalledWith('sfx', 0.4)
    setChannel.mockRestore()
  })
})
