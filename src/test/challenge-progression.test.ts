import { describe, expect, it } from 'vitest'
import {
  chaseWordGain,
  endlessDifficultyForStage,
  FROG_MAX_FAILURES,
  FROG_RULES_VERSION,
  getChaseStageRules,
  getFrogRoundDurationMs,
  getFrogStageRules,
  getMatchEndlessRoundRules,
  getMatchStageRules,
  getSpellStageRules,
  getSpellVisibleLetterCount,
  MATCH_AUTO_ADVANCE_DELAY_MS,
  MATCH_ENDLESS_RULES_VERSION,
  MATCH_MAX_FAILURES,
  MATCH_RULES_VERSION,
  SPELL_AUTO_ADVANCE_DELAY_MS,
  SPELL_RESCUE_AFTER_MISTAKES,
  SPELL_RULES_VERSION,
  SPELL_RUN_WORD_COUNT,
  spellStageForCompletedWords,
  spellWordsIntoStage,
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

  it('keeps the three-stage garden stable and defines bounded endless rounds', () => {
    expect(MATCH_RULES_VERSION).toBe('1.1.0')
    expect(MATCH_ENDLESS_RULES_VERSION).toBe('1.0.0')
    expect(MATCH_MAX_FAILURES).toBe(3)
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

    expect(getMatchEndlessRoundRules(1)).toEqual({
      roundNumber: 1,
      pairCount: 8,
      maxWordDifficulty: 5,
      roundDurationMs: 100_000,
      label: '第 1 轮',
    })
    expect(getMatchEndlessRoundRules(2)).toMatchObject({ pairCount: 10, roundDurationMs: 95_000 })
    expect(getMatchEndlessRoundRules(3)).toMatchObject({ pairCount: 12, roundDurationMs: 90_000 })
    expect(getMatchEndlessRoundRules(99)).toMatchObject({ pairCount: 12, roundDurationMs: 45_000 })
    expect(getMatchEndlessRoundRules(0)).toEqual(getMatchEndlessRoundRules(1))
  })


  it('moves the Letter Train through four hint stations every four completed words', () => {
    expect(SPELL_RULES_VERSION).toBe('1.0.0')
    expect(SPELL_AUTO_ADVANCE_DELAY_MS).toBe(700)
    expect(SPELL_RESCUE_AFTER_MISTAKES).toBe(2)
    expect(SPELL_RUN_WORD_COUNT).toBe(16)
    expect(spellStageForCompletedWords(0)).toBe(1)
    expect(spellStageForCompletedWords(3)).toBe(1)
    expect(spellStageForCompletedWords(4)).toBe(2)
    expect(spellStageForCompletedWords(8)).toBe(3)
    expect(spellStageForCompletedWords(12)).toBe(4)
    expect(spellStageForCompletedWords(99)).toBe(4)
    expect(spellStageForCompletedWords(-1)).toBe(1)
    expect(spellWordsIntoStage(9)).toBe(1)
    expect(getSpellStageRules(1)).toEqual({ stageLevel: 1, hintRatio: 1, hintMode: 'full-scramble', label: '满载车站' })
    expect(getSpellStageRules(2)).toEqual({ stageLevel: 2, hintRatio: 0.7, hintMode: 'partial-scramble', label: '轻装车站' })
    expect(getSpellStageRules(3)).toEqual({ stageLevel: 3, hintRatio: 0.35, hintMode: 'sparse-scramble', label: '记忆车站' })
    expect(getSpellStageRules(99)).toEqual({ stageLevel: 4, hintRatio: 0, hintMode: 'recall', label: '独立出发' })
  })

  it('reduces scrambled letters monotonically and grants only one rescue letter', () => {
    expect(getSpellVisibleLetterCount(7, 1)).toBe(7)
    expect(getSpellVisibleLetterCount(7, 2)).toBe(5)
    expect(getSpellVisibleLetterCount(7, 3)).toBe(2)
    expect(getSpellVisibleLetterCount(7, 4)).toBe(0)
    expect(getSpellVisibleLetterCount(7, 4, 1)).toBe(0)
    expect(getSpellVisibleLetterCount(7, 4, 2)).toBe(1)
    expect(getSpellVisibleLetterCount(7, 2, 2)).toBe(6)
    expect(getSpellVisibleLetterCount(7, 1, 99)).toBe(7)
    expect(getSpellVisibleLetterCount(-1, 1)).toBe(0)

    for (let length = 3; length <= 12; length += 1) {
      const counts = [1, 2, 3, 4].map((stage) => getSpellVisibleLetterCount(length, stage))
      expect(counts[0]).toBe(length)
      expect(counts[0]).toBeGreaterThan(counts[1])
      expect(counts[1]).toBeGreaterThan(counts[2])
      expect(counts[2]).toBeGreaterThan(counts[3])
    }
  })

  it('builds six repeating districts with bounded target speed and useful word gains', () => {
    expect(getChaseStageRules(1)).toMatchObject({ districtTheme: 0, startingDistance: 100 })
    expect(getChaseStageRules(7).districtTheme).toBe(0)
    expect(getChaseStageRules(100).targetMetersPerSecond).toBeLessThanOrEqual(1.5)
    expect(chaseWordGain(8, 6, 4)).toBeGreaterThan(chaseWordGain(3, 1, 4))
  })
})
