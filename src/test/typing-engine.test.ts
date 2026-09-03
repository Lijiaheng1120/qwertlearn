import { describe, expect, it } from 'vitest'
import { TypingEngine } from '../core/typing-engine'

describe('TypingEngine', () => {
  it('advances only on correct letters and completes a word', () => {
    const engine = new TypingEngine('cat')

    expect(engine.input('c', 0).type).toBe('correct')
    expect(engine.input('a', 1_000).type).toBe('correct')
    const completed = engine.input('t', 2_000)

    expect(completed.type).toBe('complete')
    expect(completed.snapshot.typed).toBe('cat')
    expect(completed.snapshot.status).toBe('complete')
    expect(completed.snapshot.accuracy).toBe(1)
    expect(completed.snapshot.wpm).toBe(18)
  })

  it('records a mistake without advancing the caret', () => {
    const engine = new TypingEngine('book')

    const mistake = engine.input('x', 0)
    expect(mistake.type).toBe('mistake')
    expect(mistake.expected).toBe('b')
    expect(mistake.snapshot.expectedIndex).toBe(0)
    expect(mistake.snapshot.errors).toBe(1)

    const corrected = engine.input('B', 500)
    expect(corrected.type).toBe('correct')
    expect(corrected.snapshot.typed).toBe('b')
    expect(corrected.snapshot.accuracy).toBe(0.5)
  })

  it('supports backspace without erasing historical accuracy', () => {
    const engine = new TypingEngine('frog')
    engine.input('f', 0)
    engine.input('r', 300)

    const backspace = engine.input('Backspace', 500)
    expect(backspace.type).toBe('backspace')
    expect(backspace.snapshot.typed).toBe('f')
    expect(backspace.snapshot.correctKeystrokes).toBe(2)
  })

  it('normalizes surrounding whitespace and English letter case', () => {
    const engine = new TypingEngine('  Green  ')
    for (const letter of 'GREEN') engine.input(letter)
    expect(engine.snapshot().word).toBe('green')
    expect(engine.snapshot().status).toBe('complete')
  })

  it('ignores unsupported keys, empty backspace, and input after completion', () => {
    const engine = new TypingEngine('a')
    expect(engine.input('Shift').type).toBe('ignored')
    expect(engine.input('Backspace').type).toBe('ignored')
    expect(engine.input('a', 100).type).toBe('complete')
    expect(engine.input('b', 200).type).toBe('ignored')
    expect(engine.snapshot(300).typed).toBe('a')
  })

  it('resets all per-word state for the next target', () => {
    const engine = new TypingEngine('cat')
    engine.input('x', 0)
    engine.input('c', 100)

    expect(engine.reset(' Book ')).toMatchObject({
      word: 'book',
      typed: '',
      expectedIndex: 0,
      errors: 0,
      correctKeystrokes: 0,
      totalKeystrokes: 0,
      status: 'idle',
      accuracy: 1,
      wpm: 0,
    })
  })
})
