import { getSpellStageRules, getSpellVisibleLetterCount, type SpellHintMode, type SpellStageRules } from './challenge-progression'
import { TypingEngine, type TypingEventType } from './typing-engine'

export type SpellRandomSource = () => number

export interface SpellHintSnapshot {
  stageLevel: SpellStageRules['stageLevel']
  hintMode: SpellHintMode
  letters: string[]
  visibleCount: number
  totalLetters: number
  rescueApplied: boolean
}

function normalizedRandomValue(random: SpellRandomSource): number {
  const value = random()
  if (!Number.isFinite(value)) return 0
  return Math.min(1 - Number.EPSILON, Math.max(0, value))
}

function normalizeLetter(letter: string): string {
  const normalized = TypingEngine.normalizeWord(letter)
  if (!/^[a-z]$/.test(normalized)) {
    throw new RangeError('Spell hints support one English letter per entry')
  }
  return normalized
}

export function getSpellLetters(word: string): string[] {
  const normalized = TypingEngine.normalizeWord(word)
  if (!/^[a-z]+$/.test(normalized)) {
    throw new RangeError('Spell words must contain English letters only')
  }
  return [...normalized]
}

export function createSpellLetterOrder(
  word: string,
  random: SpellRandomSource = Math.random,
): string[] {
  const source = getSpellLetters(word)
  const shuffled = [...source]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizedRandomValue(random) * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  if (shuffled.length > 1 && shuffled.join('') === source.join('')) {
    const differentIndex = shuffled.findIndex((letter, index) => index > 0 && letter !== shuffled[0])
    if (differentIndex > 0) {
      ;[shuffled[0], shuffled[differentIndex]] = [shuffled[differentIndex], shuffled[0]]
    }
  }

  return shuffled
}

export function buildSpellHint(
  letterOrder: readonly string[],
  stageLevel: number,
  consecutiveMistakes = 0,
): SpellHintSnapshot {
  const normalizedOrder = letterOrder.map(normalizeLetter)
  const stageRules = getSpellStageRules(stageLevel)
  const baseVisibleCount = getSpellVisibleLetterCount(normalizedOrder.length, stageRules.stageLevel)
  const visibleCount = getSpellVisibleLetterCount(
    normalizedOrder.length,
    stageRules.stageLevel,
    consecutiveMistakes,
  )
  return {
    stageLevel: stageRules.stageLevel,
    hintMode: stageRules.hintMode,
    letters: normalizedOrder.slice(0, visibleCount),
    visibleCount,
    totalLetters: normalizedOrder.length,
    rescueApplied: visibleCount > baseVisibleCount,
  }
}

export function nextSpellMistakeStreak(current: number, eventType: TypingEventType): number {
  const streak = Math.max(0, Number.isFinite(current) ? Math.floor(current) : 0)
  if (eventType === 'mistake') return streak + 1
  if (eventType === 'correct' || eventType === 'complete') return 0
  return streak
}
