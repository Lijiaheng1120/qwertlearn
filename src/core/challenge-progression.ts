import type { DifficultyProfile } from './models'

export const WORDS_PER_STAGE = 8
export const FROG_RULES_VERSION = '1.3.0'
export const CHASE_RULES_VERSION = '1.3.0'
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
