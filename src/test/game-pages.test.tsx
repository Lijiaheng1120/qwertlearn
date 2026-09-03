import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { audioService, type AudioSettings } from '../core/audio-service'
import { progressStore } from '../core/progress-store'
import { ChaseGamePage } from '../pages/ChaseGamePage'
import { FrogGamePage, getFrogRoundDurationMs } from '../pages/FrogGamePage'
import { TrainingPage } from '../pages/TrainingPage'

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
    showMistake() {}
    showRescue() {}
    resetRun() {}

    jumpToNext(): Promise<void> {
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
    expect(screen.getByLabelText('剩余 3 次机会')).toBeInTheDocument()
    expect(screen.getByText(/按第一个字母后开始/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'c' })
    act(() => setDocumentHidden(true))
    expect(screen.getByRole('heading', { name: '游戏已暂停' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByLabelText('剩余 3 次机会')).toBeInTheDocument()
    act(() => setDocumentHidden(false))
    act(() => vi.advanceTimersByTime(duration + 200))
    expect(screen.getByLabelText('剩余 2 次机会')).toBeInTheDocument()
    view.unmount()
  })

  it('settles an interrupted jump and persists the active run as incomplete', async () => {
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
    expect(screen.getByLabelText('剩余 2 次机会')).toBeInTheDocument()
    await expireFrogRound('b')
    expect(screen.getByLabelText('剩余 1 次机会')).toBeInTheDocument()
    await expireFrogRound('g', false)

    expect(screen.getByLabelText('剩余 0 次机会')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '青蛙坐船回岸边了' })).toBeInTheDocument()
    await act(async () => Promise.resolve())
    expect(saveRun).toHaveBeenCalledOnce()
    expect(saveRun.mock.calls[0][0]).toMatchObject({
      gameId: 'frog',
      completed: false,
      correctWords: 0,
      mistakes: 0,
      wordIds: [],
      mistakeWordIds: ['exp-cat', 'exp-book', 'exp-green'],
      rulesVersion: '1.2.0',
    })

    act(() => vi.advanceTimersByTime(60_000))
    expect(saveRun).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '重新挑战' }))
    expect(screen.getByLabelText('剩余 3 次机会')).toBeInTheDocument()
    expect(screen.getByText('0/8')).toBeInTheDocument()
    expect(screen.getByText(/按第一个字母后开始/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '青蛙坐船回岸边了' })).not.toBeInTheDocument()

    view.unmount()
    await act(async () => Promise.resolve())
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

    expect(saveRun).toHaveBeenCalledOnce()
    const run = saveRun.mock.calls[0][0]
    expect(run).toMatchObject({
      gameId: 'chase',
      completed: true,
      pausedMs: 10_000,
      remainingDistance: 0,
      wordIds: ['exp-cat', 'exp-book', 'exp-green', 'exp-frog', 'exp-river', 'exp-jump', 'exp-school', 'exp-friend'],
      mistakeWordIds: [],
      rulesVersion: '1.2.0',
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
    expect(screen.getByLabelText('警察距离目标还有 100 米')).toBeInTheDocument()
    expect(saveRun).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'x' })
    await typeWord('cat')
    expect(screen.getByLabelText('警察距离目标还有 87 米')).toBeInTheDocument()
    expect(screen.getByText(/连续正确/)).toHaveTextContent('连续正确 1')

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
      remainingDistance: 87,
      rulesVersion: '1.2.0',
      startedAt: initialTime + 120_000,
    })
    expect(saveRun.mock.calls[0][0].durationMs).toBeGreaterThanOrEqual(90_000)
    expect(saveRun.mock.calls[0][0].durationMs).toBeLessThan(91_000)

    fireEvent.click(screen.getByRole('button', { name: '重新追踪' }))
    expect(screen.getByText('90', { selector: '.game-hud b' })).toBeInTheDocument()
    expect(screen.getByLabelText('警察距离目标还有 100 米')).toBeInTheDocument()
    expect(screen.getByText(/连续正确/)).toHaveTextContent('连续正确 0')
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
