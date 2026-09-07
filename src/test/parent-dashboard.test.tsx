import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { audioService } from '../core/audio-service'
import { EMPTY_DASHBOARD, type RunResult } from '../core/models'
import { progressStore } from '../core/progress-store'
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
        onRewardChanged={vi.fn().mockResolvedValue(undefined)}
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
        onRewardChanged={vi.fn().mockResolvedValue(undefined)}
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

  it('approves a cash wish as an offline parent fulfillment', async () => {
    const pendingState = {
      ...EMPTY_DASHBOARD.rewardState,
      balance: 2_100,
      lifetimeEarned: 2_100,
      redemptions: [{
        id: 'cash-1', rewardId: 'family-cash', rewardName: '现金奖励 ¥2', kind: 'family' as const,
        cost: 2_000, status: 'pending' as const, requestedAt: 1, resolvedAt: null,
        cashAmountYuan: 2, cashRatePointsPerYuan: 1_000,
      }],
    }
    const approvedState = {
      ...pendingState,
      balance: 100,
      redemptions: pendingState.redemptions.map((item) => ({ ...item, status: 'fulfilled' as const, resolvedAt: 2 })),
    }
    const resolve = vi.spyOn(progressStore, 'resolveFamilyReward').mockResolvedValue(approvedState)
    render(
      <ParentDashboard
        summary={{ ...EMPTY_DASHBOARD, rewardState: pendingState }}
        audioSettings={{ muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRewardChanged={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByText(/现金 ¥2 · 1000 积分\/元 · 共需 2000 积分/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '批准并线下兑现 现金奖励 ¥2' }))
    await waitFor(() => expect(resolve).toHaveBeenCalledWith('cash-1', true))
    expect(screen.getByRole('status')).toHaveTextContent('请家长线下兑现 ¥2')
    expect(screen.getByText('余额 100 分')).toBeInTheDocument()
  })

  it('approves a pending family reward through ProgressStore before deducting points', async () => {
    const pendingState = {
      ...EMPTY_DASHBOARD.rewardState,
      balance: 1_600,
      lifetimeEarned: 1_600,
      redemptions: [{
        id: 'family-1', rewardId: 'family-notebook', rewardName: '新练习本', kind: 'family' as const,
        cost: 1_500, status: 'pending' as const, requestedAt: 1, resolvedAt: null,
      }],
    }
    const approvedState = {
      ...pendingState,
      balance: 100,
      redemptions: pendingState.redemptions.map((item) => ({ ...item, status: 'fulfilled' as const, resolvedAt: 2 })),
    }
    const resolve = vi.spyOn(progressStore, 'resolveFamilyReward').mockResolvedValue(approvedState)
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(
      <ParentDashboard
        summary={{ ...EMPTY_DASHBOARD, rewardState: pendingState }}
        audioSettings={{ muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRewardChanged={refresh}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '批准 新练习本' }))
    await waitFor(() => expect(resolve).toHaveBeenCalledWith('family-1', true))
    expect(screen.getByRole('status')).toHaveTextContent('积分已经扣除')
    expect(screen.getByText('余额 100 分')).toBeInTheDocument()
    expect(refresh).toHaveBeenCalledOnce()
  })
})
