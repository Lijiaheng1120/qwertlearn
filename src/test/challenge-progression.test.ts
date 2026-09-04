import { describe, expect, it } from 'vitest'
import {
  chaseWordGain,
  endlessDifficultyForStage,
  FROG_MAX_FAILURES,
  FROG_RULES_VERSION,
  getChaseStageRules,
  getFrogRoundDurationMs,
  getFrogStageRules,
  getMatchStageRules,
  MATCH_AUTO_ADVANCE_DELAY_MS,
  MATCH_RULES_VERSION,
  stageForCompletedWords,
  wordsIntoStage,
} from '../core/challenge-progression'
import { INITIAL_DIFFICULTY } from '../core/models'

describe('challenge progression', () => {
  it('versions the fixed three-failure cap for both frog challenge modes', () => {
    expect(FROG_MAX_FAILURES).toBe(3)
    expect(FROG_RULES_VERSION).toBe('1.4.0')
  })

  it('raises the stage every eight words without imposing a final stage', () => {
    expect(stageForCompletedWords(0)).toBe(1)
    expect(stageForCompletedWords(7)).toBe(1)
    expect(stageForCompletedWords(8)).toBe(2)
    expect(stageForCompletedWords(80, 3)).toBe(13)
    expect(wordsIntoStage(17)).toBe(1)
  })

  it('adds rows through stage four and keeps increasing movement pressure', () => {
    expect(getFrogStageRules(1)).toMatchObject({ lilyRows: 1, reverseRows: false })
    expect(getFrogStageRules(4)).toMatchObject({ lilyRows: 4, reverseRows: true })
    expect(getFrogStageRules(12).lilyRows).toBe(4)
    expect(getFrogStageRules(12).movementMultiplier).toBeGreaterThan(getFrogStageRules(5).movementMultiplier)
  })

  it('keeps long words fair while shortening later-stage windows', () => {
    expect(getFrogRoundDurationMs('cat', 1, 1)).toBeGreaterThanOrEqual(18_000)
    expect(getFrogRoundDurationMs('cat', 1, 6)).toBeLessThan(getFrogRoundDurationMs('cat', 1, 1))
    expect(getFrogRoundDurationMs('morning', 5, 50)).toBeGreaterThan(getFrogRoundDurationMs('cat', 5, 50))
    expect(getFrogRoundDurationMs('cat', 5, 50)).toBeGreaterThanOrEqual(5_000)
  })

  it('never lowers endless difficulty and introduces higher-stage minimum tiers', () => {
    expect(endlessDifficultyForStage(INITIAL_DIFFICULTY, 7)).toMatchObject({ speedTier: 4, hintLevel: 0 })
    expect(endlessDifficultyForStage({ speedTier: 5, hintLevel: 0, recentAccuracy: 0.7 }, 2))
      .toMatchObject({ speedTier: 5, hintLevel: 0, recentAccuracy: 0.7 })
  })

  it('progresses the Word Garden automatically from 4 untimed pairs to 8 timed pairs', () => {
    expect(MATCH_RULES_VERSION).toBe('1.1.0')
    expect(MATCH_AUTO_ADVANCE_DELAY_MS).toBe(900)
    expect(getMatchStageRules(1)).toEqual({
      stageLevel: 1,
      pairCount: 4,
      maxWordDifficulty: 2,
      roundDurationMs: null,
      label: '萌芽',
    })
    expect(getMatchStageRules(2)).toMatchObject({ pairCount: 6, maxWordDifficulty: 3, roundDurationMs: 120_000 })
    expect(getMatchStageRules(3)).toMatchObject({ pairCount: 8, maxWordDifficulty: 5, roundDurationMs: 90_000 })
    expect(getMatchStageRules(99)).toEqual(getMatchStageRules(3))
  })

  it('builds six repeating districts with bounded target speed and useful word gains', () => {
    expect(getChaseStageRules(1)).toMatchObject({ districtTheme: 0, startingDistance: 100 })
    expect(getChaseStageRules(7).districtTheme).toBe(0)
    expect(getChaseStageRules(100).targetMetersPerSecond).toBeLessThanOrEqual(1.5)
    expect(chaseWordGain(8, 6, 4)).toBeGreaterThan(chaseWordGain(3, 1, 4))
  })
})
