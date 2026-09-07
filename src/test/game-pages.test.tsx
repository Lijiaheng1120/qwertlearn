import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { audioService, type AudioSettings } from '../core/audio-service'
import { progressStore } from '../core/progress-store'
import { ChaseGamePage } from '../pages/ChaseGamePage'
import { FrogGamePage, getFrogRoundDurationMs } from '../pages/FrogGamePage'
import { TrainingPage } from '../pages/TrainingPage'

const frogMockState = vi.hoisted(() => ({ holdJump: false }))

vi.mock('phaser', () => {
  class MockGame {
    canvas: HTMLCanvasElement

    constructor(config: { parent: HTMLElement }) {
      this.canvas = document.createElement('canvas')
      config.parent.appendChild(this.canvas)
    }

    destroy(removeCanvas: boolean) {
      if (removeCanvas) this.canvas.remove()
    }
  }

  return {
    default: {
      AUTO: 0,
      Scale: { FIT: 0, CENTER_BOTH: 0 },
      Game: MockGame,
    },
  }
})

vi.mock('../games/frog/FrogScene', () => {
  class FrogScene {
    private pendingResolve: (() => void) | null = null

    setTarget() {}
    configureStage() {}
    applyRewards() {}
    showStageBanner() {}
    showMistake() {}
    showRescue() {}
    resetRun() {}

    jumpToNext(): Promise<void> {
      if (!frogMockState.holdJump) return Promise.resolve()
      return new Promise((resolve) => { this.pendingResolve = resolve })
    }

    cancelPendingActions() {
      this.pendingResolve?.()
      this.pendingResolve = null
    }
  }

  return { FrogScene }
})

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

async function typeWord(word: string): Promise<void> {
  for (const letter of word) fireEvent.keyDown(window, { key: letter })
  await act(async () => Promise.resolve())
}

function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  frogMockState.holdJump = false
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete (document as unknown as { hidden?: boolean }).hidden
})

describe('FrogGamePage timing and lifecycle', () => {
  it('keeps exactly one Phaser canvas after the StrictMode probe mount', async () => {
    vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    const view = render(
      <StrictMode>
        <FrogGamePage
          audioSettings={audioSettings}
          navigate={vi.fn()}
          toggleAudio={vi.fn()}
          onRunSaved={vi.fn().mockResolvedValue(undefined)}
        />
      </StrictMode>,
    )
    await act(async () => Promise.resolve())
    expect(view.container.querySelectorAll('.phaser-frame canvas')).toHaveLength(1)
    view.unmount()
  })

  it('gives tier-one words 18 to 30 seconds and waits for the first key', () => {
    vi.useFakeTimers()
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')

    const duration = getFrogRoundDurationMs('cat', 1)
    expect(duration).toBeGreaterThanOrEqual(18_000)
    expect(duration).toBeLessThanOrEqual(30_000)

    const view = render(
      <FrogGamePage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByLabelText('失败 0 次，最多 3 次')).toBeInTheDocument()
    expect(screen.getByText(/按第一个字母后开始/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'c' })
    act(() => setDocumentHidden(true))
    expect(screen.getByRole('heading', { name: '游戏已暂停' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByLabelText('失败 0 次，最多 3 次')).toBeInTheDocument()
    act(() => setDocumentHidden(false))
    act(() => vi.advanceTimersByTime(duration + 200))
    expect(screen.getByLabelText('失败 1 次，最多 3 次')).toBeInTheDocument()
    view.unmount()
  })

  it('settles an interrupted jump and persists the active run as incomplete', async () => {
    frogMockState.holdJump = true
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = render(
      <FrogGamePage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await typeWord('cat')
    view.unmount()
    await act(async () => Promise.resolve())

    expect(saveRun).toHaveBeenCalled()
    expect(saveRun.mock.calls.at(-1)?.[0]).toMatchObject({
      gameId: 'frog',
      completed: false,
      correctWords: 1,
    })
  })

  async function expireFrogRound(firstLetter: string, waitForNextRound = true): Promise<void> {
    fireEvent.keyDown(window, { key: firstLetter })
    act(() => vi.advanceTimersByTime(31_000))
    await act(async () => Promise.resolve())
    if (waitForNextRound) {
      act(() => vi.advanceTimersByTime(400))
      await act(async () => Promise.resolve())
    }
  }

  it('loses after three timeouts, saves once, and fully resets on restart', async () => {
    vi.useFakeTimers()
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = render(
      <FrogGamePage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await expireFrogRound('c')
    expect(screen.getByLabelText('失败 1 次，最多 3 次')).toBeInTheDocument()
    await expireFrogRound('b')
    expect(screen.getByLabelText('失败 2 次，最多 3 次')).toBeInTheDocument()
    await expireFrogRound('g', false)

    expect(screen.getByLabelText('失败 3 次，最多 3 次')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '青蛙坐船回岸边了' })).toBeInTheDocument()
    await act(async () => Promise.resolve())
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'frog',
      completed: false,
      correctWords: 0,
      mistakes: 0,
      failures: 3,
      wordIds: [],
      mistakeWordIds: ['exp-cat', 'exp-book', 'exp-green'],
      rulesVersion: '1.4.0',
      challengeMode: 'learning',
      startStage: 1,
      highestStage: 1,
    })

    act(() => vi.advanceTimersByTime(60_000))
    expect(saveRun).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '重新挑战' }))
    expect(screen.getByLabelText('失败 0 次，最多 3 次')).toBeInTheDocument()
    expect(screen.getByText('0/8')).toBeInTheDocument()
    expect(screen.getByText(/按第一个字母后开始/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '青蛙坐船回岸边了' })).not.toBeInTheDocument()

    view.unmount()
    await act(async () => Promise.resolve())
    expect(saveRun).toHaveBeenCalledOnce()
  })

  it('promotes after eight words without auto-settlement and unlocks endless play', async () => {
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = render(
      <FrogGamePage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    for (const word of ['cat', 'book', 'green', 'frog', 'river', 'jump', 'school', 'friend']) {
      await typeWord(word)
    }

    expect(saveRun).not.toHaveBeenCalled()
    expect(view.container.querySelector('.game-hud')).toHaveTextContent('阶段 2')
    expect(view.container.querySelector('.game-hud')).toHaveTextContent('本阶段 0/8')
    expect(screen.getByRole('button', { name: /无尽挑战/ })).toHaveTextContent('从已解锁阶段 2 开始')
    expect(screen.getByRole('button', { name: /无尽挑战/ })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '结束本局并结算' }))
    await act(async () => Promise.resolve())
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'frog',
      completed: true,
      correctWords: 8,
      challengeMode: 'learning',
      startStage: 1,
      highestStage: 2,
      rulesVersion: '1.4.0',
    })
  })

  it('starts endless play from the highest unlocked checkpoint', async () => {
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    render(
      <FrogGamePage
        audioSettings={audioSettings}
        highestUnlockedStage={4}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /无尽挑战/ }))
    await typeWord('cat')
    fireEvent.click(screen.getByRole('button', { name: '结束本局并结算' }))
    await act(async () => Promise.resolve())

    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      challengeMode: 'endless',
      startStage: 4,
      highestStage: 4,
      correctWords: 1,
      rulesVersion: '1.4.0',
    })
  })

  it('stops endless play on the third failure and persists the explicit count', async () => {
    vi.useFakeTimers()
    const { FrogScene } = await import('../games/frog/FrogScene')
    const cancelPendingActions = vi.spyOn(FrogScene.prototype, 'cancelPendingActions')
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    render(
      <FrogGamePage
        audioSettings={audioSettings}
        highestUnlockedStage={4}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /无尽挑战/ }))
    expect(screen.getByLabelText('失败 0 次，最多 3 次')).toBeInTheDocument()
    await expireFrogRound('c')
    expect(screen.getByLabelText('失败 1 次，最多 3 次')).toBeInTheDocument()
    await expireFrogRound('b')
    expect(screen.getByLabelText('失败 2 次，最多 3 次')).toBeInTheDocument()
    await expireFrogRound('g', false)

    expect(screen.getByLabelText('失败 3 次，最多 3 次')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '青蛙坐船回岸边了' })).toBeInTheDocument()
    expect(screen.getByText(/累计失败 3\/3 次，本局结束/)).toBeInTheDocument()
    expect(cancelPendingActions).toHaveBeenCalledOnce()
    await act(async () => Promise.resolve())
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'frog',
      completed: false,
      failures: 3,
      challengeMode: 'endless',
      startStage: 4,
      highestStage: 4,
      rulesVersion: '1.4.0',
    })

    act(() => vi.advanceTimersByTime(60_000))
    fireEvent.keyDown(window, { key: 'x' })
    await act(async () => Promise.resolve())
    expect(screen.getByLabelText('失败 3 次，最多 3 次')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '青蛙坐船回岸边了' })).toBeInTheDocument()
    expect(saveRun).toHaveBeenCalledOnce()
  })

  it('shows a storage warning when a failed run falls back to memory', async () => {
    vi.useFakeTimers()
    vi.spyOn(progressStore, 'saveRun').mockResolvedValue('memory')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    render(
      <FrogGamePage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await expireFrogRound('c')
    await expireFrogRound('b')
    await expireFrogRound('g', false)
    await act(async () => Promise.resolve())

    expect(screen.getByRole('status')).toHaveTextContent('本局暂存在当前页面')
  })
})

describe('ChaseGamePage timing fairness', () => {
  it('excludes pre-start idle and hidden time from the saved successful duration', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T00:00:00.000Z'))
    const initialTime = Date.now()
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})

    render(
      <ChaseGamePage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    act(() => vi.advanceTimersByTime(5_000))
    fireEvent.keyDown(window, { key: 'c' })
    act(() => vi.advanceTimersByTime(1_000))
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: 't' })
    await act(async () => Promise.resolve())

    act(() => setDocumentHidden(true))
    act(() => vi.advanceTimersByTime(10_000))
    act(() => setDocumentHidden(false))

    for (const word of ['book', 'green', 'frog', 'river', 'jump', 'school', 'friend']) {
      act(() => vi.advanceTimersByTime(250))
      await typeWord(word)
    }
    await act(async () => Promise.resolve())
    expect(saveRun).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/当前街区 2，已追回 1 枚徽章/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '结束巡逻并结算' }))
    await act(async () => Promise.resolve())

    expect(saveRun).toHaveBeenCalledOnce()
    const run = saveRun.mock.calls[0][0]
    expect(run).toMatchObject({
      gameId: 'chase',
      completed: true,
      pausedMs: 10_000,
      remainingDistance: expect.any(Number),
      challengeMode: 'endless',
      startStage: 1,
      highestStage: 2,
      badgesRecovered: 1,
      wordIds: ['exp-cat', 'exp-book', 'exp-green', 'exp-frog', 'exp-river', 'exp-jump', 'exp-school', 'exp-friend'],
      mistakeWordIds: [],
      rulesVersion: '1.3.0',
    })
    expect(run.startedAt).toBe(initialTime + 5_000)
    expect(run.durationMs).toBeGreaterThanOrEqual(2_500)
    expect(run.durationMs).toBeLessThan(5_000)
  })

  it('waits for the first key, saves remaining distance on timeout, and resets on restart', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T00:00:00.000Z'))
    const initialTime = Date.now()
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    const view = render(
      <ChaseGamePage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    act(() => vi.advanceTimersByTime(120_000))
    expect(screen.getByText('90', { selector: '.game-hud b' })).toBeInTheDocument()
    expect(screen.getByLabelText('巡逻员距离移动目标还有 100 米')).toBeInTheDocument()
    expect(saveRun).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'x' })
    await typeWord('cat')
    const movingStage = screen.getByLabelText(/巡逻员距离移动目标还有 \d+ 米/)
    expect(movingStage).not.toHaveAttribute('aria-label', '巡逻员距离移动目标还有 100 米')
    expect(view.container.querySelector('.chase-hud')).toHaveTextContent('连续 1')

    act(() => vi.advanceTimersByTime(90_100))
    await act(async () => Promise.resolve())
    expect(screen.getByRole('heading', { name: '线索还在' })).toBeInTheDocument()
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'chase',
      completed: false,
      correctWords: 1,
      mistakes: 1,
      maxStreak: 1,
      wordIds: ['exp-cat'],
      mistakeWordIds: ['exp-cat', 'exp-book'],
      remainingDistance: expect.any(Number),
      challengeMode: 'endless',
      startStage: 1,
      highestStage: 1,
      badgesRecovered: 0,
      rulesVersion: '1.3.0',
      startedAt: initialTime + 120_000,
    })
    expect(saveRun.mock.calls[0][0].durationMs).toBeGreaterThanOrEqual(90_000)
    expect(saveRun.mock.calls[0][0].durationMs).toBeLessThan(91_000)

    fireEvent.click(screen.getByRole('button', { name: '重新追踪' }))
    expect(screen.getByText('90', { selector: '.game-hud b' })).toBeInTheDocument()
    expect(screen.getByLabelText('巡逻员距离移动目标还有 100 米')).toBeInTheDocument()
    expect(view.container.querySelector('.chase-hud')).toHaveTextContent('连续 0')
    expect(screen.queryByRole('heading', { name: '线索还在' })).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(120_000))
    expect(screen.getByText('90', { selector: '.game-hud b' })).toBeInTheDocument()
    view.unmount()
    await act(async () => Promise.resolve())
    expect(saveRun).toHaveBeenCalledOnce()
  })

  it('shows a storage warning when a timed-out run falls back to memory', async () => {
    vi.useFakeTimers()
    vi.spyOn(progressStore, 'saveRun').mockResolvedValue('memory')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    render(
      <ChaseGamePage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    fireEvent.keyDown(window, { key: 'c' })
    act(() => vi.advanceTimersByTime(90_100))
    await act(async () => Promise.resolve())

    expect(screen.getByRole('status')).toHaveTextContent('本局暂存在当前页面')
  })
})

describe('TrainingPage timing', () => {
  it('starts timing on the first key and saves active training duration', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T00:00:00.000Z'))
    const initialTime = Date.now()
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})

    render(
      <TrainingPage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    act(() => vi.advanceTimersByTime(5_000))
    for (const pattern of ['fj', 'dk', 'sl', 'as', 'jkl', 'asdf']) {
      await typeWord(pattern)
      if (pattern !== 'asdf') act(() => vi.advanceTimersByTime(220))
    }
    await act(async () => Promise.resolve())

    expect(saveRun).toHaveBeenCalledOnce()
    const run = saveRun.mock.calls[0][0]
    expect(run).toMatchObject({
      gameId: 'training',
      completed: true,
      pausedMs: 0,
      usedFullHints: true,
      rulesVersion: '1.2.0',
    })
    expect(run.startedAt).toBe(initialTime + 5_000)
    expect(run.durationMs).toBeGreaterThanOrEqual(1_000)
    expect(run.durationMs).toBeLessThan(2_000)
  })

  async function completeTraining(): Promise<void> {
    for (const pattern of ['fj', 'dk', 'sl', 'as', 'jkl', 'asdf']) {
      await typeWord(pattern)
      if (pattern !== 'asdf') act(() => vi.advanceTimersByTime(220))
    }
    await act(async () => Promise.resolve())
  }

  it('counts mistakes, excludes hidden time, and continues to the frog game', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T00:00:00.000Z'))
    const saveRun = vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
    const navigate = vi.fn()
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    render(
      <TrainingPage
        audioSettings={audioSettings}
        navigate={navigate}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    fireEvent.keyDown(window, { key: 'x' })
    act(() => vi.advanceTimersByTime(1_000))
    act(() => setDocumentHidden(true))
    expect(screen.getByRole('heading', { name: '热身已暂停' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(10_000))
    act(() => setDocumentHidden(false))
    act(() => vi.advanceTimersByTime(1_000))

    await completeTraining()
    expect(saveRun).toHaveBeenCalledOnce()
    const run = saveRun.mock.calls[0][0]
    expect(run).toMatchObject({
      gameId: 'training',
      completed: true,
      mistakes: 1,
      pausedMs: 10_000,
      wordIds: ['key-fj', 'key-dk', 'key-sl', 'key-as', 'key-jkl', 'key-asdf'],
      mistakeWordIds: ['key-fj'],
      usedFullHints: true,
    })
    expect(run.durationMs).toBeGreaterThanOrEqual(3_000)
    expect(run.durationMs).toBeLessThan(4_000)
    expect(screen.getByRole('heading', { name: '双手准备好了！' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '去池塘冒险' }))
    expect(navigate).toHaveBeenCalledWith('frog')
  })

  it('shows a storage warning when completed training falls back to memory', async () => {
    vi.useFakeTimers()
    vi.spyOn(progressStore, 'saveRun').mockResolvedValue('memory')
    vi.spyOn(audioService, 'play').mockImplementation(() => {})
    vi.spyOn(audioService, 'speak').mockImplementation(() => {})
    render(
      <TrainingPage
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRunSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await completeTraining()

    expect(screen.getByRole('status')).toHaveTextContent('本次热身暂存在当前页面')

    fireEvent.click(screen.getByRole('button', { name: '重新热身' }))
    expect(screen.getByText('第 1 / 6 组')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '双手准备好了！' })).not.toBeInTheDocument()
  })
})
