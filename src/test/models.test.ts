import { describe, expect, it } from 'vitest'
import { adaptDifficulty, buildLeaderboardKey, INITIAL_DIFFICULTY, type RunResult } from '../core/models'

describe('adaptive difficulty', () => {
  it('waits for enough evidence before changing difficulty', () => {
    expect(adaptDifficulty(INITIAL_DIFFICULTY, 0.98, 4)).toEqual({
      ...INITIAL_DIFFICULTY,
      recentAccuracy: 0.98,
    })
  })

  it('raises speed and fades hints above 92% accuracy', () => {
    expect(adaptDifficulty(INITIAL_DIFFICULTY, 0.95, 6)).toMatchObject({
      speedTier: 2,
      hintLevel: 2,
    })
  })

  it('restores support below 80% accuracy', () => {
    expect(adaptDifficulty({ speedTier: 3, hintLevel: 1, recentAccuracy: 0.9 }, 0.72, 7)).toMatchObject({
      speedTier: 2,
      hintLevel: 2,
    })
  })

  it('keeps the current tier and hints inside the neutral accuracy band', () => {
    expect(adaptDifficulty({ speedTier: 3, hintLevel: 1, recentAccuracy: 0.9 }, 0.86, 8)).toEqual({
      speedTier: 3,
      hintLevel: 1,
      recentAccuracy: 0.86,
    })
  })

  it('clamps speed and hints at both supported boundaries', () => {
    expect(adaptDifficulty({ speedTier: 5, hintLevel: 0, recentAccuracy: 1 }, 1, 10)).toMatchObject({
      speedTier: 5,
      hintLevel: 0,
    })
    expect(adaptDifficulty({ speedTier: 1, hintLevel: 3, recentAccuracy: 0.5 }, 0.5, 10)).toMatchObject({
      speedTier: 1,
      hintLevel: 3,
    })
  })
})

describe('leaderboard isolation', () => {
  const base: Pick<RunResult, 'gameId' | 'mode' | 'wordPackId' | 'difficulty' | 'speedTier' | 'rulesVersion'> = {
    gameId: 'frog',
    mode: 'copy',
    wordPackId: 'experience-grade-4',
    difficulty: 1,
    speedTier: 1,
    rulesVersion: '1.0.0',
  }

  it('changes the board key when any fairness dimension changes', () => {
    const key = buildLeaderboardKey(base)
    expect(buildLeaderboardKey({ ...base, gameId: 'chase' })).not.toBe(key)
    expect(buildLeaderboardKey({ ...base, mode: 'recall' })).not.toBe(key)
    expect(buildLeaderboardKey({ ...base, wordPackId: 'textbook-unit-1' })).not.toBe(key)
    expect(buildLeaderboardKey({ ...base, difficulty: 2 })).not.toBe(key)
    expect(buildLeaderboardKey({ ...base, speedTier: 2 })).not.toBe(key)
    expect(buildLeaderboardKey({ ...base, rulesVersion: '1.1.0' })).not.toBe(key)
  })
})
