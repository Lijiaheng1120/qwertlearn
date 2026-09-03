import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  buildLeaderboardKey,
  EMPTY_DASHBOARD,
  EXPERIENCE_WORDS,
  type DashboardSummary,
  type GameId,
  type RunResult,
} from './models'
import { buildWordMemory } from './word-session'

interface QwertLearnDatabase extends DBSchema {
  runs: {
    key: string
    value: RunResult
    indexes: {
      'by-completed-at': number
      'by-game': string
    }
  }
}

export type SaveLocation = 'indexeddb' | 'memory'

const DATABASE_NAME = 'qwertlearn'
const DATABASE_VERSION = 1

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function normalizeRun(run: RunResult): RunResult {
  return {
    ...run,
    pausedMs: Number.isFinite(run.pausedMs) ? run.pausedMs : 0,
    usedFullHints: run.usedFullHints ?? true,
    wordIds: Array.isArray(run.wordIds) ? run.wordIds : [],
    mistakeWordIds: Array.isArray(run.mistakeWordIds) ? run.mistakeWordIds : [],
  }
}

function sortByCompletedAt(runs: RunResult[]): RunResult[] {
  return runs.map(normalizeRun).sort((left, right) => right.completedAt - left.completedAt)
}

function sortLeaderboard(left: RunResult, right: RunResult): number {
  if (left.gameId === 'chase' && right.gameId === 'chase') {
    if (left.completed !== right.completed) return left.completed ? -1 : 1
    if (left.completed) return left.durationMs - right.durationMs || right.score - left.score
    const leftDistance = left.remainingDistance ?? Number.POSITIVE_INFINITY
    const rightDistance = right.remainingDistance ?? Number.POSITIVE_INFINITY
    return leftDistance - rightDistance || right.score - left.score
  }
  return right.score - left.score || left.durationMs - right.durationMs
}

export class ProgressStore {
  private memoryRuns: RunResult[] = []
  private databasePromise: Promise<IDBPDatabase<QwertLearnDatabase>> | null = null

  constructor(private readonly databaseName = DATABASE_NAME) {}

  private getDatabase(): Promise<IDBPDatabase<QwertLearnDatabase>> {
    this.databasePromise ??= openDB<QwertLearnDatabase>(this.databaseName, DATABASE_VERSION, {
      upgrade(database) {
        const runs = database.createObjectStore('runs', { keyPath: 'id' })
        runs.createIndex('by-completed-at', 'completedAt')
        runs.createIndex('by-game', 'gameId')
      },
    })
    return this.databasePromise
  }

  async saveRun(run: RunResult): Promise<SaveLocation> {
    const normalizedRun = normalizeRun(run)
    if (!canUseIndexedDb()) {
      this.memoryRuns.push(normalizedRun)
      return 'memory'
    }

    try {
      const database = await this.getDatabase()
      await database.put('runs', normalizedRun)
      return 'indexeddb'
    } catch {
      this.memoryRuns.push(normalizedRun)
      return 'memory'
    }
  }

  async listRuns(): Promise<RunResult[]> {
    if (!canUseIndexedDb()) return sortByCompletedAt(this.memoryRuns)

    try {
      const database = await this.getDatabase()
      const persistedRuns = await database.getAllFromIndex('runs', 'by-completed-at')
      return sortByCompletedAt([...persistedRuns, ...this.memoryRuns])
    } catch {
      return sortByCompletedAt(this.memoryRuns)
    }
  }

  async listRunsByGame(gameId: GameId): Promise<RunResult[]> {
    if (!canUseIndexedDb()) {
      return sortByCompletedAt(this.memoryRuns.filter((run) => run.gameId === gameId))
    }

    try {
      const database = await this.getDatabase()
      const persistedRuns = await database.getAllFromIndex('runs', 'by-game', gameId)
      const memoryRuns = this.memoryRuns.filter((run) => run.gameId === gameId)
      return sortByCompletedAt([...persistedRuns, ...memoryRuns])
    } catch {
      return sortByCompletedAt(this.memoryRuns.filter((run) => run.gameId === gameId))
    }
  }

  async getLeaderboard(boardKey: string, limit = 10): Promise<RunResult[]> {
    const gameId = boardKey.split(':', 1)[0] as GameId
    const runs = ['training', 'frog', 'chase'].includes(gameId)
      ? await this.listRunsByGame(gameId)
      : await this.listRuns()
    return runs
      .filter((run) => buildLeaderboardKey(run) === boardKey)
      .sort(sortLeaderboard)
      .slice(0, limit)
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const runs = await this.listRuns()
    if (runs.length === 0) return { ...EMPTY_DASHBOARD }

    const words = new Set(runs.flatMap((run) => run.words))
    const wordMemory = buildWordMemory(runs, EXPERIENCE_WORDS)
    const correctCharacters = runs.reduce((sum, run) => sum + run.correctCharacters, 0)
    const mistakes = runs.reduce((sum, run) => sum + run.mistakes, 0)
    const practiceDates = new Set(runs.map((run) => new Date(run.completedAt).toDateString()))
    const today = new Date().toDateString()
    const todayRuns = runs.filter((run) => new Date(run.completedAt).toDateString() === today)

    const latestFrog = runs.find((run) => run.gameId === 'frog')
    const bestFrogBoardKey = latestFrog ? buildLeaderboardKey(latestFrog) : null
    const comparableFrogRuns = bestFrogBoardKey
      ? runs.filter((run) => run.gameId === 'frog' && buildLeaderboardKey(run) === bestFrogBoardKey)
      : []

    const latestCompletedChase = runs.find((run) => run.gameId === 'chase' && run.completed)
    const bestChaseBoardKey = latestCompletedChase ? buildLeaderboardKey(latestCompletedChase) : null
    const comparableCompletedChases = bestChaseBoardKey
      ? runs.filter((run) => run.gameId === 'chase' && run.completed && buildLeaderboardKey(run) === bestChaseBoardKey)
      : []

    return {
      masteredWords: words.size,
      wrongWordCount: wordMemory.filter((word) => word.needsReview).length,
      wordMemory,
      totalMinutes: Math.round(runs.reduce((sum, run) => sum + run.durationMs, 0) / 60_000),
      todayMinutes: Math.round(todayRuns.reduce((sum, run) => sum + run.durationMs, 0) / 60_000),
      accuracy: correctCharacters + mistakes === 0 ? 1 : correctCharacters / (correctCharacters + mistakes),
      practiceDays: practiceDates.size,
      bestFrogStreak: comparableFrogRuns.reduce((best, run) => Math.max(best, run.maxStreak), 0),
      bestFrogBoardKey,
      bestChaseMs: comparableCompletedChases.length === 0
        ? null
        : Math.min(...comparableCompletedChases.map((run) => run.durationMs)),
      bestChaseBoardKey,
      recentRuns: runs.slice(0, 6),
    }
  }

  async clear(): Promise<void> {
    this.memoryRuns = []
    if (!canUseIndexedDb()) return
    try {
      const database = await this.getDatabase()
      await database.clear('runs')
    } catch {
      // Memory state is already clear; unavailable IndexedDB needs no further action.
    }
  }
}

export const progressStore = new ProgressStore()
