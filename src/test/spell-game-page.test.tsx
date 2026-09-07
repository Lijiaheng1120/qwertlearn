import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { audioService } from '../core/audio-service'
import { progressStore } from '../core/progress-store'
import { SpellGamePage } from '../pages/SpellGamePage'

const { fixedWords } = vi.hoisted(() => ({
  fixedWords: [
    { id: 'spell-cat', text: 'cat', meaning: '猫' },
    { id: 'spell-dog', text: 'dog', meaning: '狗' },
    { id: 'spell-sun', text: 'sun', meaning: '太阳' },
    { id: 'spell-map', text: 'map', meaning: '地图' },
    { id: 'spell-book', text: 'book', meaning: '书本' },
    { id: 'spell-fish', text: 'fish', meaning: '鱼' },
    { id: 'spell-tree', text: 'tree', meaning: '树' },
    { id: 'spell-moon', text: 'moon', meaning: '月亮' },
    { id: 'spell-apple', text: 'apple', meaning: '苹果' },
    { id: 'spell-river', text: 'river', meaning: '河流' },
    { id: 'spell-green', text: 'green', meaning: '绿色' },
    { id: 'spell-chair', text: 'chair', meaning: '椅子' },
    { id: 'spell-school', text: 'school', meaning: '学校' },
    { id: 'spell-friend', text: 'friend', meaning: '朋友' },
    { id: 'spell-morning', text: 'morning', meaning: '早晨' },
    { id: 'spell-window', text: 'window', meaning: '窗户' },
  ].map((word, index) => ({
    ...word,
    grade: 4,
    unit: '测试词库',
    difficulty: Math.min(5, 1 + Math.floor(index / 4)) as 1 | 2 | 3 | 4 | 5,
    tags: ['test'],
  })),
}))

vi.mock('../core/word-session', () => ({
  createWordSession: vi.fn(() => fixedWords),
}))

const audioSettings = { muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }

function renderGame() {
  const navigate = vi.fn()
  const onRunSaved = vi.fn().mockResolvedValue(undefined)
  const view = render(
    <SpellGamePage
      audioSettings={audioSettings}
      wordMemory={[]}
      navigate={navigate}
      toggleAudio={vi.fn()}
      onRunSaved={onRunSaved}
    />,
  )
  return { ...view, navigate, onRunSaved }
}

function typeWord(word: string) {
  for (const letter of word) fireEvent.keyDown(window, { key: letter })
}

async function advanceTrain() {
  await act(async () => {
    vi.advanceTimersByTime(700)
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(audioService, 'play').mockImplementation(() => {})
  vi.spyOn(audioService, 'speak').mockImplementation(() => {})
  vi.spyOn(progressStore, 'saveRun').mockResolvedValue('indexeddb')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SpellGamePage', () => {
  it('preserves the correct prefix and grants only one stable rescue letter after two mistakes', async () => {
    const { container } = renderGame()

    expect(screen.getByText('字母小火车')).toBeInTheDocument()
    expect(screen.getByText('猫')).toBeInTheDocument()
    expect(screen.getByText('轨道旁乱序货物：3 / 3 个字母')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /年级|未来初中/ })).toHaveLength(4)

    for (const word of fixedWords.slice(0, 4)) {
      typeWord(word.text)
      expect(screen.getByText(new RegExp(`${word.text} 装车完成`))).toBeInTheDocument()
      await advanceTrain()
    }

    expect(container.querySelector('.spell-station-list li.active strong')).toHaveTextContent('轻装车站')
    expect(screen.getByText('书本')).toBeInTheDocument()
    expect(screen.getByText('轨道旁乱序货物：3 / 4 个字母')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'b' })
    fireEvent.keyDown(window, { key: 'x' })
    fireEvent.keyDown(window, { key: 'x' })

    expect(container.querySelectorAll('.spell-carriage.filled')).toHaveLength(1)
    expect(screen.getByText('轨道旁乱序货物：4 / 4 个字母')).toBeInTheDocument()
    expect(screen.getByText('救援提示 +1')).toBeInTheDocument()
    expect(screen.getByText(/正确车厢都保留|临时多送来/)).toBeInTheDocument()
  })

  it('pauses shared typing and resumes from the same carriage', () => {
    const { container } = renderGame()

    fireEvent.keyDown(window, { key: 'c' })
    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    expect(screen.getByRole('dialog', { name: '小火车已停靠' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'a' })
    expect(container.querySelectorAll('.spell-carriage.filled')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /继续装车/ }))
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: 't' })
    expect(screen.getByText(/cat 装车完成/)).toBeInTheDocument()
  })

  it('locks the selected level after input and saves an incomplete isolated run', async () => {
    renderGame()

    fireEvent.click(screen.getByRole('button', { name: /五年级进阶/ }))
    fireEvent.keyDown(window, { key: 'c' })
    expect(screen.getByRole('button', { name: /四年级基础/ })).toBeDisabled()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '结束并结算' }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('dialog', { name: '本次小火车旅程已结算' })).toBeInTheDocument()
    expect(progressStore.saveRun).toHaveBeenCalledOnce()
    expect(progressStore.saveRun).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'spell',
      mode: 'recall',
      wordPackId: 'fltrp-grade5-v1',
      difficulty: 1,
      rulesVersion: '1.0.0',
      completed: false,
      correctWords: 0,
      highestStage: 1,
      mistakeWordIds: ['spell-cat'],
    }))
  })

  it('automatically completes all four stations and persists the full 16-word result once', async () => {
    const { onRunSaved, container } = renderGame()

    for (const word of fixedWords) {
      if (word.text.length > 6) {
        const compactTrain = container.querySelector<HTMLElement>('.spell-train.compact')
        expect(compactTrain).toBeInTheDocument()
        expect(compactTrain?.style.getPropertyValue('--spell-compact-carriage-width')).toMatch(/px$/)
      }
      typeWord(word.text)
      await advanceTrain()
    }

    expect(screen.getByRole('dialog', { name: '四座车站全部通关！' })).toBeInTheDocument()
    expect(progressStore.saveRun).toHaveBeenCalledOnce()
    const run = vi.mocked(progressStore.saveRun).mock.calls[0][0]
    expect(run).toMatchObject({
      gameId: 'spell',
      mode: 'recall',
      wordPackId: 'fltrp-grade4-v1',
      difficulty: 4,
      speedTier: 1,
      rulesVersion: '1.0.0',
      completed: true,
      correctWords: 16,
      highestStage: 4,
      rescueHints: 0,
      usedFullHints: false,
    })
    expect(run.words).toEqual(fixedWords.map((word) => word.text))
    expect(run.wordIds).toEqual(fixedWords.map((word) => word.id))
    expect(onRunSaved).toHaveBeenCalledOnce()
    expect(audioService.play).toHaveBeenCalledWith('spell.depart')
    expect(audioService.play).toHaveBeenCalledWith('run.success')
  })
})
