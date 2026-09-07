import type { DifficultyProfile } from './models'

export const WORDS_PER_STAGE = 8
export const FROG_MAX_FAILURES = 3
export const FROG_RULES_VERSION = '1.4.0'
export const CHASE_RULES_VERSION = '1.3.0'
export const MATCH_RULES_VERSION = '1.1.0'
export const MATCH_ENDLESS_RULES_VERSION = '1.0.0'
export const MATCH_FINAL_STAGE = 3
export const MATCH_MAX_FAILURES = 3
export const MATCH_AUTO_ADVANCE_DELAY_MS = 900
export const SPELL_RULES_VERSION = '1.0.0'
export const SPELL_WORDS_PER_STAGE = 4
export const SPELL_FINAL_STAGE = 4
export const SPELL_RUN_WORD_COUNT = SPELL_WORDS_PER_STAGE * SPELL_FINAL_STAGE
export const SPELL_AUTO_ADVANCE_DELAY_MS = 700
export const SPELL_RESCUE_AFTER_MISTAKES = 2
export const CHASE_RUN_DURATION_MS = 90_000
export const CHASE_START_DISTANCE = 100
export const CHASE_MAX_DISTANCE = 160

export interface FrogStageRules {
  stageLevel: number
  lilyRows: 1 | 2 | 3 | 4
  movementMultiplier: number
  timeMultiplier: number
  reverseRows: boolean
}

export interface ChaseStageRules {
  stageLevel: number
  targetMetersPerSecond: number
  startingDistance: number
  catchDistance: number
  districtTheme: number
}

export interface MatchStageRules {
  stageLevel: 1 | 2 | 3
  pairCount: 4 | 6 | 8
  maxWordDifficulty: 2 | 3 | 5
  roundDurationMs: number | null
  label: '萌芽' | '开花' | '盛放'
}

export interface MatchEndlessRoundRules {
  roundNumber: number
  pairCount: 8 | 10 | 12
  maxWordDifficulty: 5
  roundDurationMs: number
  label: string
}

export type SpellHintMode = 'full-scramble' | 'partial-scramble' | 'sparse-scramble' | 'recall'

export interface SpellStageRules {
  stageLevel: 1 | 2 | 3 | 4
  hintRatio: 1 | 0.7 | 0.35 | 0
  hintMode: SpellHintMode
  label: '满载车站' | '轻装车站' | '记忆车站' | '独立出发'
}

function positiveStage(stageLevel: number): number {
  return Math.max(1, Number.isFinite(stageLevel) ? Math.floor(stageLevel) : 1)
}

export function stageForCompletedWords(completedWords: number, startStage = 1): number {
  const completed = Math.max(0, Number.isFinite(completedWords) ? Math.floor(completedWords) : 0)
  return positiveStage(startStage) + Math.floor(completed / WORDS_PER_STAGE)
}

export function wordsIntoStage(completedWords: number): number {
  const completed = Math.max(0, Number.isFinite(completedWords) ? Math.floor(completedWords) : 0)
  return completed % WORDS_PER_STAGE
}

export function getFrogStageRules(stageLevel: number): FrogStageRules {
  const stage = positiveStage(stageLevel)
  return {
    stageLevel: stage,
    lilyRows: Math.min(4, stage) as 1 | 2 | 3 | 4,
    movementMultiplier: Number((1 + (stage - 1) * 0.16).toFixed(2)),
    timeMultiplier: Number(Math.max(0.58, 1 - (stage - 1) * 0.055).toFixed(3)),
    reverseRows: stage >= 2,
  }
}

export function getFrogRoundDurationMs(word: string, speedTier: number, stageLevel = 1): number {
  const tierIndex = Math.max(0, Math.min(4, Math.floor(speedTier) - 1))
  const tierMultiplier = [1.6, 1.3, 1.05, 0.9, 0.78][tierIndex]
  const minimum = [18_000, 14_000, 11_000, 8_000, 7_000][tierIndex]
  const maximum = [30_000, 25_000, 21_000, 18_000, 15_000][tierIndex]
  const stageMultiplier = getFrogStageRules(stageLevel).timeMultiplier
  const baseDuration = Math.max(minimum, Math.min(maximum, (4_000 + word.length * 2_200) * tierMultiplier))
  const absoluteFloor = Math.max(5_000, 3_600 + word.length * 650)
  return Math.round(Math.max(absoluteFloor, baseDuration * stageMultiplier))
}

export function endlessDifficultyForStage(current: DifficultyProfile, stageLevel: number): DifficultyProfile {
  const minimumTier = Math.min(5, 1 + Math.floor((positiveStage(stageLevel) - 1) / 2)) as DifficultyProfile['speedTier']
  const speedTier = Math.max(current.speedTier, minimumTier) as DifficultyProfile['speedTier']
  const maximumHint = Math.max(0, 4 - speedTier) as DifficultyProfile['hintLevel']
  return {
    speedTier,
    hintLevel: Math.min(current.hintLevel, maximumHint) as DifficultyProfile['hintLevel'],
    recentAccuracy: current.recentAccuracy,
  }
}

export function getChaseStageRules(stageLevel: number): ChaseStageRules {
  const stage = positiveStage(stageLevel)
  return {
    stageLevel: stage,
    targetMetersPerSecond: Number(Math.min(1.5, 0.42 + (stage - 1) * 0.11).toFixed(2)),
    startingDistance: Math.min(118, CHASE_START_DISTANCE + (stage - 1) * 3),
    catchDistance: Math.min(26, 14 + Math.floor((stage - 1) / 2)),
    districtTheme: (stage - 1) % 6,
  }
}

export function chaseWordGain(wordLength: number, streak: number, stageLevel: number): number {
  const stage = getChaseStageRules(stageLevel)
  const lengthBonus = Math.max(0, wordLength) * 1.4
  const streakBonus = Math.min(8, Math.max(0, streak - 1) * 1.2)
  return Math.round(stage.catchDistance + lengthBonus + streakBonus)
}

export function getMatchStageRules(stageLevel: number): MatchStageRules {
  const stage = Math.min(MATCH_FINAL_STAGE, positiveStage(stageLevel)) as 1 | 2 | 3
  if (stage === 1) {
    return { stageLevel: 1, pairCount: 4, maxWordDifficulty: 2, roundDurationMs: null, label: '萌芽' }
  }
  if (stage === 2) {
    return { stageLevel: 2, pairCount: 6, maxWordDifficulty: 3, roundDurationMs: 120_000, label: '开花' }
  }
  return { stageLevel: 3, pairCount: 8, maxWordDifficulty: 5, roundDurationMs: 90_000, label: '盛放' }
}


export function spellStageForCompletedWords(completedWords: number): SpellStageRules['stageLevel'] {
  const completed = Math.max(0, Number.isFinite(completedWords) ? Math.floor(completedWords) : 0)
  return Math.min(SPELL_FINAL_STAGE, 1 + Math.floor(completed / SPELL_WORDS_PER_STAGE)) as SpellStageRules['stageLevel']
}

export function spellWordsIntoStage(completedWords: number): number {
  const completed = Math.max(0, Number.isFinite(completedWords) ? Math.floor(completedWords) : 0)
  return completed % SPELL_WORDS_PER_STAGE
}

export function getSpellStageRules(stageLevel: number): SpellStageRules {
  const stage = Math.min(SPELL_FINAL_STAGE, positiveStage(stageLevel)) as SpellStageRules['stageLevel']
  if (stage === 1) return { stageLevel: 1, hintRatio: 1, hintMode: 'full-scramble', label: '满载车站' }
  if (stage === 2) return { stageLevel: 2, hintRatio: 0.7, hintMode: 'partial-scramble', label: '轻装车站' }
  if (stage === 3) return { stageLevel: 3, hintRatio: 0.35, hintMode: 'sparse-scramble', label: '记忆车站' }
  return { stageLevel: 4, hintRatio: 0, hintMode: 'recall', label: '独立出发' }
}

export function getSpellVisibleLetterCount(
  wordLength: number,
  stageLevel: number,
  consecutiveMistakes = 0,
): number {
  const length = Math.max(0, Number.isFinite(wordLength) ? Math.floor(wordLength) : 0)
  if (length === 0) return 0
  const stage = getSpellStageRules(stageLevel).stageLevel
  const partial = length <= 1
    ? length
    : Math.max(1, Math.min(length - 1, Math.round(length * 0.7)))
  const sparse = length <= 2
    ? Math.min(1, length)
    : Math.max(1, Math.min(partial - 1, Math.round(length * 0.35)))
  const baseCount = stage === 1 ? length : stage === 2 ? partial : stage === 3 ? sparse : 0
  const mistakes = Math.max(0, Number.isFinite(consecutiveMistakes) ? Math.floor(consecutiveMistakes) : 0)
  const rescueCount = mistakes >= SPELL_RESCUE_AFTER_MISTAKES && baseCount < length ? 1 : 0
  return Math.min(length, baseCount + rescueCount)
}

export function getMatchEndlessRoundRules(roundNumber: number): MatchEndlessRoundRules {
  const round = positiveStage(roundNumber)
  const pairCount = round === 1 ? 8 : round === 2 ? 10 : 12
  return {
    roundNumber: round,
    pairCount,
    maxWordDifficulty: 5,
    roundDurationMs: Math.max(45_000, 100_000 - (round - 1) * 5_000),
    label: `第 ${round} 轮`,
  }
}
