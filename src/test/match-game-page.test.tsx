import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { audioService, type AudioSettings } from '../core/audio-service'
import { MATCH_AUTO_ADVANCE_DELAY_MS } from '../core/challenge-progression'
import { ALL_VOCABULARY_WORDS } from '../core/models'
import { progressStore } from '../core/progress-store'
import { MatchGamePage } from '../pages/MatchGamePage'

vi.mock('../core/word-session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/word-session')>()
  return {
    ...actual,
    createWordSession: <T,>(wordBank: T[], _memory: unknown[], options: { length: number }) => wordBank.slice(0, options.length),
  }
})

const audioSettings: AudioSettings = {
  muted: false,
  music: 0.35,
  sfx: 0.7,
  voice: 1,
  ui: 0.5,
}

function renderGame(initialEndlessUnlocked = false) {
  return render(
    <MatchGamePage
      audioSettings={audioSettings}
      initialEndlessUnlocked={initialEndlessUnlocked}
      navigate={vi.fn()}
      toggleAudio={vi.fn()}
      onRunSaved={vi.fn().mockResolvedValue(undefined)}
    />,
  )
}

async function matchVisiblePairs(container: HTMLElement): Promise<void> {
  const englishCards = [...container.querySelectorAll<HTMLButtonElement>('.match-word-card:not(.meaning):not(:disabled)')]
  for (const englishCard of englishCards) {
    const word = ALL_VOCABULARY_WORDS.find((item) => item.text === englishCard.textContent)
    if (!word) throw new Error(`Missing test word for ${englishCard.textContent}`)
    fireEvent.click(englishCard)
    fireEvent.click(screen.getByRole('button', { name: `${word.meaning} 中文卡` }))
    await act(async () => Promise.resolve())
  }
}

async function waitForAutomaticStageAdvance(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(MATCH_AUTO_ADVANCE_DELAY_MS)
    await Promise.resolve()
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('MatchGamePage', () => {
  it('gives mismatches gentle feedback and eliminates a correct English-Chinese pair', async () => {
    vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = renderGame()

    fireEvent.click(screen.getByRole('button', { name: 'cat 英文卡' }))
    fireEvent.click(screen.getByRole('button', { name: '书本 中文卡' }))
    await waitFor(() => expect(screen.getByText('还不是这一对，记住位置再试一次')).toBeInTheDocument())
    expect(view.container.querySelector('.match-hud')).toHaveTextContent('错配 1')

    fireEvent.click(screen.getByRole('button', { name: 'cat 英文卡' }))
    fireEvent.click(screen.getByRole('button', { name: '猫 中文卡' }))
    await waitFor(() => expect(view.container.querySelector('.match-hud')).toHaveTextContent('本关 1/4 对'))
    expect(screen.getByRole('button', { name: 'cat 英文卡' })).toBeDisabled()
    expect(audioService.play).toHaveBeenCalledWith('match.correct')
  })

  it('automatically progresses through 4, 6, and 8-pair stages before settling a full garden run', async () => {
    vi.useFakeTimers()
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = renderGame()

    expect(screen.getByRole('button', { name: /无尽挑战/ })).toBeDisabled()
    await matchVisiblePairs(view.container)
    expect(screen.getByText('萌芽关完成！')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /进入下一关/ })).not.toBeInTheDocument()
    await waitForAutomaticStageAdvance()
    expect(view.container.querySelector('.match-hud')).toHaveTextContent('第 2 / 3 关')

    await matchVisiblePairs(view.container)
    expect(screen.getByText('开花关完成！')).toBeInTheDocument()
    await waitForAutomaticStageAdvance()
    expect(view.container.querySelector('.match-hud')).toHaveTextContent('第 3 / 3 关')

    await matchVisiblePairs(view.container)
    await act(async () => Promise.resolve())
    expect(screen.getByRole('heading', { name: '词语花园盛开了！' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /无尽挑战/ })).toHaveTextContent('8 / 10 / 12 对 · 三次失败结束')
    fireEvent.click(screen.getByRole('button', { name: '再种一座花园' }))
    expect(screen.getByRole('button', { name: /无尽挑战/ })).toBeEnabled()
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'match',
      mode: 'recall',
      wordPackId: 'fltrp-grade4-v1',
      rulesVersion: '1.1.0',
      completed: true,
      correctWords: 18,
      startStage: 1,
      highestStage: 3,
      usedFullHints: false,
    })
  })


  it('automatically grows endless rounds from 8 to 10 to 12 pairs and saves the isolated mode', async () => {
    vi.useFakeTimers()
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = renderGame(true)

    fireEvent.click(screen.getByRole('button', { name: /无尽挑战/ }))
    expect(screen.getByRole('button', { name: /无尽挑战/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('失败 0 次，最多 3 次')).toBeInTheDocument()
    expect(view.container.querySelectorAll('.match-word-card:not(.meaning)')).toHaveLength(8)

    await matchVisiblePairs(view.container)
    expect(screen.getByText('第 1 轮完成！')).toBeInTheDocument()
    await waitForAutomaticStageAdvance()
    expect(view.container.querySelector('.match-hud')).toHaveTextContent('第 2 轮')
    expect(view.container.querySelectorAll('.match-word-card:not(.meaning)')).toHaveLength(10)

    await matchVisiblePairs(view.container)
    await waitForAutomaticStageAdvance()
    expect(view.container.querySelector('.match-hud')).toHaveTextContent('第 3 轮')
    expect(view.container.querySelectorAll('.match-word-card:not(.meaning)')).toHaveLength(12)

    fireEvent.click(screen.getByRole('button', { name: '结束本局并结算' }))
    await act(async () => Promise.resolve())
    expect(screen.getByRole('heading', { name: '本次无尽花园已结算' })).toBeInTheDocument()
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'match',
      rulesVersion: '1.0.0',
      challengeMode: 'endless',
      completed: true,
      correctWords: 18,
      failures: 0,
      startStage: 1,
      highestStage: 3,
    })
  })

  it('retries the same endless round after timeouts and stops exactly on the third failure', async () => {
    vi.useFakeTimers()
    let currentTime = 0
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime)
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = renderGame(true)
    fireEvent.click(screen.getByRole('button', { name: /无尽挑战/ }))

    const expireCurrentRound = async (failure: number) => {
      const firstCard = view.container.querySelector<HTMLButtonElement>('.match-word-card:not(.meaning):not(:disabled)')
      if (!firstCard) throw new Error('Missing endless English card')
      fireEvent.click(firstCard)
      currentTime += 100_100
      await act(async () => {
        vi.advanceTimersByTime(100)
        await Promise.resolve()
      })
      expect(screen.getByLabelText(`失败 ${failure} 次，最多 3 次`)).toBeInTheDocument()
    }

    await expireCurrentRound(1)
    expect(screen.getByText('第 1 轮超时，失败 1/3，即将换牌重试')).toBeInTheDocument()
    await waitForAutomaticStageAdvance()
    expect(view.container.querySelector('.match-hud')).toHaveTextContent('第 1 轮')
    expect(view.container.querySelectorAll('.match-word-card:not(.meaning)')).toHaveLength(8)

    await expireCurrentRound(2)
    await waitForAutomaticStageAdvance()
    expect(view.container.querySelector('.match-hud')).toHaveTextContent('第 1 轮')

    await expireCurrentRound(3)
    expect(screen.getByRole('heading', { name: '无尽花园暂时休息' })).toBeInTheDocument()
    expect(screen.getByText(/累计失败 3\/3 次，本局结束/)).toBeInTheDocument()
    await act(async () => Promise.resolve())
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'match',
      rulesVersion: '1.0.0',
      challengeMode: 'endless',
      completed: false,
      correctWords: 0,
      mistakes: 24,
      failures: 3,
      startStage: 1,
      highestStage: 1,
    })

    act(() => vi.advanceTimersByTime(60_000))
    expect(saveRun).toHaveBeenCalledOnce()
  })

  it('selects an advanced vocabulary level and isolates its saved run', async () => {
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    renderGame()

    fireEvent.click(screen.getByRole('button', { name: /六年级挑战/ }))
    expect(screen.getByRole('button', { name: /六年级挑战/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'earth 英文卡' }))
    fireEvent.click(screen.getByRole('button', { name: '地球 中文卡' }))
    await act(async () => Promise.resolve())
    fireEvent.click(screen.getByRole('button', { name: '结束本局并结算' }))

    await waitFor(() => expect(saveRun).toHaveBeenCalledOnce())
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'match',
      wordPackId: 'fltrp-grade6-v1',
      completed: false,
      correctWords: 1,
    })
  })

  it('settles an active selection, reports memory fallback, and resets for another run', async () => {
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('memory')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    const speak = vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    renderGame()

    fireEvent.click(screen.getByRole('button', { name: 'cat 英文卡' }))
    expect(screen.getByRole('button', { name: /五年级进阶/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '朗读当前英文' }))
    expect(speak).toHaveBeenCalledWith('cat')
    fireEvent.click(screen.getByRole('button', { name: '结束本局并结算' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: '本次花园练习已结算' })).toBeInTheDocument())
    expect(screen.getByText('本局暂存在当前页面，请保持页面开启后再继续练习。')).toBeInTheDocument()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      completed: false,
      correctWords: 0,
      mistakeWordIds: ['exp-cat'],
    })

    fireEvent.click(screen.getByRole('button', { name: '继续练习' }))
    expect(screen.queryByRole('heading', { name: '本次花园练习已结算' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /五年级进阶/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: '结束本局并结算' })).toBeDisabled()
  })

  it('ends a timed stage and records every unresolved word for review', async () => {
    vi.useFakeTimers()
    let currentTime = 0
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime)
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    const play = vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = renderGame()

    await matchVisiblePairs(view.container)
    await waitForAutomaticStageAdvance()
    const firstEnglishCard = view.container.querySelector<HTMLButtonElement>('.match-word-card:not(.meaning):not(:disabled)')
    if (!firstEnglishCard) throw new Error('Missing stage-two English card')
    fireEvent.click(firstEnglishCard)

    currentTime = 120_100
    await act(async () => {
      vi.advanceTimersByTime(100)
      await Promise.resolve()
    })

    expect(screen.getByRole('heading', { name: '花朵等你再来' })).toBeInTheDocument()
    expect(play).toHaveBeenCalledWith('run.failure')
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      completed: false,
      correctWords: 4,
      mistakes: 6,
      highestStage: 2,
    })
    expect(new Set(saveRun.mock.calls[0][0].mistakeWordIds)).toHaveLength(6)
  })

  it('pauses while the page is hidden and resumes without losing the current choice', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    renderGame()

    fireEvent.click(screen.getByRole('button', { name: 'cat 英文卡' }))
    hidden.mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('heading', { name: '花园已暂停' })).toBeInTheDocument()

    hidden.mockReturnValue(false)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.queryByRole('heading', { name: '花园已暂停' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cat 英文卡' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('saves an active partial run once when the page unmounts', async () => {
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = renderGame()

    fireEvent.click(screen.getByRole('button', { name: 'cat 英文卡' }))
    view.unmount()
    await act(async () => Promise.resolve())

    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'match',
      completed: false,
      mistakeWordIds: ['exp-cat'],
    })
  })
})
