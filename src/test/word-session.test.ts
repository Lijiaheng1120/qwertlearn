import { describe, expect, it } from 'vitest'
import { EXPERIENCE_WORDS, type RunResult, type WordMemory } from '../core/models'
import { buildWordMemory, createWordSession } from '../core/word-session'

function run(overrides: Partial<RunResult>): RunResult {
  return {
    id: `run-${overrides.completedAt ?? 1}`,
    gameId: 'frog',
    mode: 'copy',
    wordPackId: 'experience-grade-4',
    difficulty: 1,
    speedTier: 1,
    rulesVersion: '1.2.0',
    startedAt: 0,
    completedAt: 1,
    durationMs: 1_000,
    pausedMs: 0,
    completed: true,
    correctWords: 0,
    correctCharacters: 0,
    mistakes: 0,
    maxStreak: 0,
    score: 0,
    words: [],
    usedFullHints: true,
    ...overrides,
  }
}

describe('word memory', () => {
  it('marks a mistyped word for review and clears it after two clean completions', () => {
    const memory = buildWordMemory([
      run({ completedAt: 1, words: ['cat'], wordIds: ['exp-cat'], mistakeWordIds: ['exp-cat'] }),
      run({ completedAt: 2, words: ['cat'], wordIds: ['exp-cat'] }),
      run({ completedAt: 3, words: ['cat'], wordIds: ['exp-cat'] }),
    ], EXPERIENCE_WORDS)

    expect(memory).toContainEqual(expect.objectContaining({
      wordId: 'exp-cat',
      completedCount: 3,
      mistakeCount: 1,
      cleanStreak: 2,
      needsReview: false,
      lastMistakeAt: 1,
    }))
  })

  it('recovers legacy completed words by their text', () => {
    const memory = buildWordMemory([run({ completedAt: 9, words: ['book'] })], EXPERIENCE_WORDS)
    expect(memory).toContainEqual(expect.objectContaining({
      wordId: 'exp-book',
      completedCount: 1,
      needsReview: false,
    }))
  })
})

describe('random word sessions', () => {
  it('returns the requested number of unique words', () => {
    const session = createWordSession(EXPERIENCE_WORDS, [], { length: 8, random: () => 0.42 })
    expect(session).toHaveLength(8)
    expect(new Set(session.map((word) => word.id)).size).toBe(8)
  })

  it('includes a review word and avoids a recently mastered word at the start', () => {
    const memory: WordMemory[] = [
      {
        wordId: 'exp-cat', text: 'cat', meaning: '猫', completedCount: 5, mistakeCount: 0,
        cleanStreak: 5, lastPracticedAt: 100, lastMistakeAt: null, needsReview: false,
      },
      {
        wordId: 'exp-book', text: 'book', meaning: '书', completedCount: 1, mistakeCount: 3,
        cleanStreak: 0, lastPracticedAt: 90, lastMistakeAt: 90, needsReview: true,
      },
    ]
    const session = createWordSession(EXPERIENCE_WORDS, memory, { length: 8, random: () => 0.25 })

    expect(session.map((word) => word.id)).toContain('exp-book')
    expect(session[0].id).not.toBe('exp-cat')
    expect(new Set(session.map((word) => word.id)).size).toBe(session.length)
  })
})
