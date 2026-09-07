import { describe, expect, it } from 'vitest'
import {
  buildSpellHint,
  createSpellLetterOrder,
  getSpellLetters,
  nextSpellMistakeStreak,
} from '../core/spell-engine'
import { TypingEngine } from '../core/typing-engine'

describe('spell engine', () => {
  it('normalizes English words and rejects unsupported answer characters', () => {
    expect(getSpellLetters('  Morning  ')).toEqual([...`morning`])
    expect(() => getSpellLetters('')).toThrow(RangeError)
    expect(() => getSpellLetters('ice cream')).toThrow(RangeError)
    expect(() => getSpellLetters('café')).toThrow(RangeError)
  })

  it('preserves every repeated letter and forces a different full order when possible', () => {
    const order = createSpellLetterOrder('letter', () => 0.999999)
    expect(order.join('')).not.toBe('letter')
    expect([...order].sort()).toEqual([...`letter`].sort())
    expect(order.filter((letter) => letter === 't')).toHaveLength(2)
    expect(order.filter((letter) => letter === 'e')).toHaveLength(2)
    expect(createSpellLetterOrder('aaa', () => 0.999999)).toEqual(['a', 'a', 'a'])
  })

  it('builds stable 100, 70, 35, and zero-percent hint snapshots', () => {
    const order = [...`yrabril`]
    const full = buildSpellHint(order, 1)
    const partial = buildSpellHint(order, 2)
    const sparse = buildSpellHint(order, 3)
    const recall = buildSpellHint(order, 4)

    expect(full).toMatchObject({ hintMode: 'full-scramble', visibleCount: 7, totalLetters: 7 })
    expect(partial).toMatchObject({ hintMode: 'partial-scramble', visibleCount: 5 })
    expect(sparse).toMatchObject({ hintMode: 'sparse-scramble', visibleCount: 2 })
    expect(recall).toMatchObject({ hintMode: 'recall', visibleCount: 0, letters: [] })
    expect(partial.letters).toEqual(full.letters.slice(0, 5))
    expect(sparse.letters).toEqual(full.letters.slice(0, 2))
    expect(order).toEqual([...`yrabril`])
  })

  it('reveals only the next stable letter after two consecutive mistakes', () => {
    const order = [...`yrabril`]
    const beforeRescue = buildSpellHint(order, 2, 1)
    const rescued = buildSpellHint(order, 2, 2)
    const recallRescued = buildSpellHint(order, 4, 2)

    expect(beforeRescue).toMatchObject({ visibleCount: 5, rescueApplied: false })
    expect(rescued).toMatchObject({ visibleCount: 6, rescueApplied: true })
    expect(rescued.letters.slice(0, 5)).toEqual(beforeRescue.letters)
    expect(recallRescued).toMatchObject({ visibleCount: 1, rescueApplied: true })
  })

  it('tracks consecutive mistakes from shared TypingEngine event types', () => {
    expect(nextSpellMistakeStreak(0, 'mistake')).toBe(1)
    expect(nextSpellMistakeStreak(1, 'mistake')).toBe(2)
    expect(nextSpellMistakeStreak(2, 'backspace')).toBe(2)
    expect(nextSpellMistakeStreak(2, 'ignored')).toBe(2)
    expect(nextSpellMistakeStreak(2, 'correct')).toBe(0)
    expect(nextSpellMistakeStreak(2, 'complete')).toBe(0)
    expect(nextSpellMistakeStreak(Number.NaN, 'mistake')).toBe(1)
  })

  it('composes with TypingEngine without clearing a correct prefix on mistakes', () => {
    const engine = new TypingEngine('book')
    const order = [...`koob`]
    let mistakeStreak = 0

    for (const key of ['x', 'y']) {
      const event = engine.input(key)
      mistakeStreak = nextSpellMistakeStreak(mistakeStreak, event.type)
    }
    expect(engine.snapshot().typed).toBe('')
    expect(buildSpellHint(order, 4, mistakeStreak)).toMatchObject({
      letters: ['k'],
      rescueApplied: true,
    })

    const correct = engine.input('b')
    mistakeStreak = nextSpellMistakeStreak(mistakeStreak, correct.type)
    expect(engine.snapshot().typed).toBe('b')
    expect(mistakeStreak).toBe(0)
  })
})
