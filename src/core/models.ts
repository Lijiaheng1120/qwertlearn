export type GameId = 'training' | 'frog' | 'chase' | 'match' | 'spell'
export type LearningMode = 'key' | 'copy' | 'recall' | 'dictation' | 'review'

export interface WordEntry {
  id: string
  text: string
  meaning: string
  grade: number
  unit: string
  difficulty: 1 | 2 | 3 | 4 | 5
  tags: string[]
}

export interface WordMemory {
  wordId: string
  text: string
  meaning: string
  completedCount: number
  mistakeCount: number
  cleanStreak: number
  lastPracticedAt: number
  lastMistakeAt: number | null
  needsReview: boolean
}

export type ChallengeMode = 'learning' | 'endless'
export type RewardKind = 'cosmetic' | 'family'
export type RewardSlot = 'frogSkin' | 'lilyTheme' | 'cityTheme'
export type RewardRedemptionStatus = 'pending' | 'fulfilled' | 'rejected'

export interface RewardDefinition {
  id: string
  name: string
  description: string
  kind: RewardKind
  cost: number
  slot?: RewardSlot
}

export interface RewardRedemption {
  id: string
  rewardId: string
  rewardName: string
  kind: RewardKind
  cost: number
  status: RewardRedemptionStatus
  requestedAt: number
  resolvedAt: number | null
  cashAmountYuan?: number
  cashRatePointsPerYuan?: number
}

export interface RewardState {
  id: string
  balance: number
  lifetimeEarned: number
  settledRunIds: string[]
  ownedRewardIds: string[]
  equippedRewards: Partial<Record<RewardSlot, string>>
  redemptions: RewardRedemption[]
}

export interface CashRewardPolicy {
  pointsPerYuan: number
  weeklyBudgetYuan: number
  fulfilledThisWeekYuan: number
  remainingBudgetYuan: number
  maxRequestYuan: number
}

export interface RunRewardBreakdown {
  basePoints: number
  stageBonus: number
  badgeBonus: number
  accuracyBonus: number
  multiplier: number
  total: number
}

export {
  EXPERIENCE_WORDS,
  GRADE_4_WORDS,
  GRADE_4_WORD_PACK_ID,
  GRADE_4_WORD_PACK_NAME,
  GRADE_4_WORD_PACK_VERSION,
  WORD_SESSION_BATCH_SIZE,
} from './grade-4-word-bank'

export {
  ALL_VOCABULARY_WORDS,
  DEFAULT_VOCABULARY_LEVEL,
  getVocabularyLevel,
  GRADE_5_WORDS,
  GRADE_6_WORDS,
  JUNIOR_PREP_WORDS,
  VOCABULARY_LEVELS,
  type VocabularyLevelDefinition,
  type VocabularyLevelId,
} from './progressive-word-bank'

export interface DifficultyProfile {
  speedTier: 1 | 2 | 3 | 4 | 5
  hintLevel: 0 | 1 | 2 | 3
  recentAccuracy: number
}

export const INITIAL_DIFFICULTY: DifficultyProfile = {
  speedTier: 1,
  hintLevel: 3,
  recentAccuracy: 1,
}

function clampTier(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, value)) as 1 | 2 | 3 | 4 | 5
}

function clampHint(value: number): 0 | 1 | 2 | 3 {
  return Math.min(3, Math.max(0, value)) as 0 | 1 | 2 | 3
}

export function adaptDifficulty(
  current: DifficultyProfile,
  accuracy: number,
  completedWords: number,
): DifficultyProfile {
  if (completedWords < 5) {
    return { ...current, recentAccuracy: accuracy }
  }

  if (accuracy >= 0.92) {
    return {
      speedTier: clampTier(current.speedTier + 1),
      hintLevel: clampHint(current.hintLevel - 1),
      recentAccuracy: accuracy,
    }
  }

  if (accuracy < 0.8) {
    return {
      speedTier: clampTier(current.speedTier - 1),
      hintLevel: clampHint(current.hintLevel + 1),
      recentAccuracy: accuracy,
    }
  }

  return { ...current, recentAccuracy: accuracy }
}

export interface RunResult {
  id: string
  gameId: GameId
  mode: LearningMode
  wordPackId: string
  difficulty: number
  speedTier: number
  rulesVersion: string
  startedAt: number
  completedAt: number
  durationMs: number
  pausedMs: number
  completed: boolean
  correctWords: number
  correctCharacters: number
  mistakes: number
  failures?: number
  rescueHints?: number
  maxStreak: number
  score: number
  words: string[]
  wordIds?: string[]
  mistakeWordIds?: string[]
  challengeMode?: ChallengeMode
  startStage?: number
  highestStage?: number
  badgesRecovered?: number
  adventurePointsEarned?: number
  rewardRulesVersion?: string
  usedFullHints: boolean
  remainingDistance?: number
}

export function createRunId(gameId: GameId): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${gameId}-${suffix}`
}

export function buildLeaderboardKey(run: Pick<RunResult,
  'gameId' | 'mode' | 'wordPackId' | 'difficulty' | 'speedTier' | 'rulesVersion'
> & Partial<Pick<RunResult, 'challengeMode' | 'startStage'>>): string {
  return [
    run.gameId,
    run.mode,
    run.wordPackId,
    run.difficulty,
    run.speedTier,
    run.rulesVersion,
    run.challengeMode ?? 'learning',
    run.startStage ?? 1,
  ].join(':')
}

export interface DashboardSummary {
  masteredWords: number
  wrongWordCount: number
  wordMemory: WordMemory[]
  rewardState: RewardState
  highestFrogStage: number
  highestChaseStage: number
  highestMatchStage: number
  highestSpellStage: number
  matchEndlessUnlocked: boolean
  totalMinutes: number
  todayMinutes: number
  accuracy: number
  practiceDays: number
  bestFrogStreak: number
  bestFrogBoardKey: string | null
  bestChaseMs: number | null
  bestChaseBoardKey: string | null
  recentRuns: RunResult[]
}

export const EMPTY_DASHBOARD: DashboardSummary = {
  masteredWords: 0,
  wrongWordCount: 0,
  wordMemory: [],
  rewardState: {
    id: 'local',
    balance: 0,
    lifetimeEarned: 0,
    settledRunIds: [],
    ownedRewardIds: [],
    equippedRewards: {},
    redemptions: [],
  },
  highestFrogStage: 0,
  highestChaseStage: 0,
  highestMatchStage: 0,
  highestSpellStage: 0,
  matchEndlessUnlocked: false,
  totalMinutes: 0,
  todayMinutes: 0,
  accuracy: 1,
  practiceDays: 0,
  bestFrogStreak: 0,
  bestFrogBoardKey: null,
  bestChaseMs: null,
  bestChaseBoardKey: null,
  recentRuns: [],
}

export const KEYBOARD_ROWS = [
  [...'qwertyuiop'],
  [...'asdfghjkl'],
  [...'zxcvbnm'],
]
