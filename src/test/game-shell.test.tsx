import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WordEntry } from '../core/models'
import type { TypingSnapshot } from '../core/typing-engine'
import { GameShell, ResultOverlay, TypingPrompt } from '../pages/GameShell'

const word: WordEntry = {
  id: 'cat', text: 'cat', meaning: '猫', grade: 4, unit: '体验', difficulty: 1, tags: [],
}
const snapshot: TypingSnapshot = {
  word: 'cat', typed: '', expectedIndex: 0, errors: 0, correctKeystrokes: 0,
  totalKeystrokes: 0, status: 'idle', accuracy: 1, wpm: 0,
}

describe('TypingPrompt', () => {
  it('tells a first-time child to use the highlighted physical key', () => {
    render(<TypingPrompt word={word} snapshot={snapshot} onSpeak={vi.fn()} />)
    expect(screen.getByText(/实体键盘上按黄色的 C 键/)).toBeInTheDocument()
    expect(screen.getByText(/黄色表示现在要按的实体键，不能点击/)).toBeInTheDocument()
  })

  it('reduces hints without removing the physical-keyboard instruction', () => {
    const { rerender } = render(<TypingPrompt word={word} snapshot={snapshot} hintLevel={2} onSpeak={vi.fn()} />)
    expect(screen.getByText(/实体键盘上按黄色的 C 键/)).toBeInTheDocument()
    expect(document.querySelectorAll('.keyboard-row')).toHaveLength(1)

    rerender(<TypingPrompt word={word} snapshot={snapshot} hintLevel={0} onSpeak={vi.fn()} />)
    expect(screen.getByText(/直接在实体键盘上输入/)).toBeInTheDocument()
    expect(document.querySelector('.screen-keyboard')).not.toBeInTheDocument()
  })

  it('plays pronunciation and announces completion without a keyboard guide', () => {
    const onSpeak = vi.fn()
    const view = render(<TypingPrompt word={word} snapshot={snapshot} hintLevel={1} onSpeak={onSpeak} />)
    fireEvent.click(screen.getByRole('button', { name: /播放 cat 的读音/ }))
    expect(onSpeak).toHaveBeenCalledOnce()
    expect(document.querySelector('.screen-keyboard')).not.toBeInTheDocument()

    view.rerender(<TypingPrompt word={word} snapshot={{ ...snapshot, typed: 'cat', expectedIndex: 3, status: 'complete' }} hintLevel={0} onSpeak={onSpeak} />)
    expect(screen.getByText('单词完成，准备前进！')).toBeInTheDocument()
  })
})

describe('GameShell', () => {
  it('routes back home, toggles audio, and renders game content', () => {
    const navigate = vi.fn()
    const toggleAudio = vi.fn()
    render(
      <GameShell
        title="测试游戏"
        subtitle="测试模式"
        audioSettings={{ muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }}
        navigate={navigate}
        toggleAudio={toggleAudio}
      >
        <p>游戏内容</p>
      </GameShell>,
    )

    expect(screen.getByText('游戏内容')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /冒险地图/ }))
    expect(navigate).toHaveBeenCalledWith('home')
    fireEvent.click(screen.getByRole('button', { name: '关闭声音' }))
    expect(toggleAudio).toHaveBeenCalledOnce()
  })
})

describe('ResultOverlay', () => {
  it('moves focus to the primary action and supports Escape', () => {
    const onExit = vi.fn()
    render(<ResultOverlay state="paused" title="暂停" detail="稍后继续" onPrimary={vi.fn()} primaryLabel="继续" onExit={onExit} />)
    const primaryAction = screen.getByRole('button', { name: /继续/ })
    expect(primaryAction).toHaveFocus()
    fireEvent.keyDown(primaryAction, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledOnce()
  })
})
