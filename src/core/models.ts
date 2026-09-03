export type GameId = 'training' | 'frog' | 'chase'
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

export const EXPERIENCE_WORDS: WordEntry[] = [
  { id: 'exp-cat', text: 'cat', meaning: '猫', grade: 4, unit: '体验词库', difficulty: 1, tags: ['animal', 'short'] },
  { id: 'exp-book', text: 'book', meaning: '书', grade: 4, unit: '体验词库', difficulty: 1, tags: ['school'] },
  { id: 'exp-green', text: 'green', meaning: '绿色', grade: 4, unit: '体验词库', difficulty: 2, tags: ['color'] },
  { id: 'exp-frog', text: 'frog', meaning: '青蛙', grade: 4, unit: '体验词库', difficulty: 1, tags: ['animal'] },
  { id: 'exp-river', text: 'river', meaning: '河流', grade: 4, unit: '体验词库', difficulty: 2, tags: ['nature'] },
  { id: 'exp-jump', text: 'jump', meaning: '跳跃', grade: 4, unit: '体验词库', difficulty: 1, tags: ['action'] },
  { id: 'exp-school', text: 'school', meaning: '学校', grade: 4, unit: '体验词库', difficulty: 2, tags: ['school'] },
  { id: 'exp-friend', text: 'friend', meaning: '朋友', grade: 4, unit: '体验词库', difficulty: 2, tags: ['people'] },
  { id: 'exp-yellow', text: 'yellow', meaning: '黄色', grade: 4, unit: '体验词库', difficulty: 2, tags: ['color'] },
  { id: 'exp-window', text: 'window', meaning: '窗户', grade: 4, unit: '体验词库', difficulty: 2, tags: ['home'] },
  { id: 'exp-teacher', text: 'teacher', meaning: '老师', grade: 4, unit: '体验词库', difficulty: 3, tags: ['people', 'school'] },
  { id: 'exp-morning', text: 'morning', meaning: '早晨', grade: 4, unit: '体验词库', difficulty: 3, tags: ['time'] },
]

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
  maxStreak: number
  score: number
  words: string[]
  wordIds?: string[]
  mistakeWordIds?: string[]
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
>): string {
  return [run.gameId, run.mode, run.wordPackId, run.difficulty, run.speedTier, run.rulesVersion].join(':')
}

export interface DashboardSummary {
  masteredWords: number
  wrongWordCount: number
  wordMemory: WordMemory[]
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
