import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  ALL_VOCABULARY_WORDS,
  buildLeaderboardKey,
  EMPTY_DASHBOARD,
  type DashboardSummary,
  type GameId,
  type RewardDefinition,
  type RewardState,
  type RunResult,
  type RunRewardBreakdown,
} from './models'
import {
  calculateRunAdventurePoints,
  calculateRunRewardBreakdown,
  createEmptyRewardState,
  mergeRewardStates,
  normalizeRewardState,
  REWARD_CATALOG,
  REWARD_RULES_VERSION,
  REWARD_STATE_ID,
  redeemCosmeticReward,
  requestFamilyReward as requestFamilyRewardState,
  resolveFamilyReward as resolveFamilyRewardState,
  RewardRuleError,
  settleRunReward,
  spendableAdventurePoints,
} from './reward-system'
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
  'reward-state': {
    key: string
    value: RewardState
  }
}

export type SaveLocation = 'indexeddb' | 'memory'

const DATABASE_NAME = 'qwertlearn'
const DATABASE_VERSION = 2

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function normalizeRun(run: RunResult): RunResult {
  const startStage = Math.max(1, Number.isFinite(run.startStage) ? Math.round(run.startStage!) : 1)
  const highestStage = Math.max(startStage, Number.isFinite(run.highestStage) ? Math.round(run.highestStage!) : startStage)
  return {
    ...run,
    pausedMs: Number.isFinite(run.pausedMs) ? run.pausedMs : 0,
    failures: Math.max(0, Number.isFinite(run.failures) ? Math.round(run.failures!) : 0),
    usedFullHints: run.usedFullHints ?? true,
    wordIds: Array.isArray(run.wordIds) ? run.wordIds : [],
    mistakeWordIds: Array.isArray(run.mistakeWordIds) ? run.mistakeWordIds : [],
    challengeMode: run.challengeMode ?? 'learning',
    startStage,
    highestStage,
    badgesRecovered: Math.max(0, Number.isFinite(run.badgesRecovered) ? Math.round(run.badgesRecovered!) : 0),
    adventurePointsEarned: calculateRunAdventurePoints(run),
    rewardRulesVersion: REWARD_RULES_VERSION,
  }
}

function sortByCompletedAt(runs: RunResult[]): RunResult[] {
  return runs.map(normalizeRun).sort((left, right) => right.completedAt - left.completedAt)
}

function createRedemptionId(): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `reward-${suffix}`
}

function hasRewardActivity(state: RewardState): boolean {
  return state.lifetimeEarned > 0
    || state.ownedRewardIds.length > 0
    || state.redemptions.length > 0
    || state.settledRunIds.length > 0
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
  private memoryRewardState: RewardState = createEmptyRewardState()
  private memoryRewardStateIsSnapshot = false
  private databasePromise: Promise<IDBPDatabase<QwertLearnDatabase>> | null = null

  constructor(private readonly databaseName = DATABASE_NAME) {}

  previewRunReward(run: RunResult): RunRewardBreakdown {
    return calculateRunRewardBreakdown(run)
  }

  getRewardCatalog(): readonly RewardDefinition[] {
    return REWARD_CATALOG
  }

  getSpendableAdventurePoints(state: RewardState): number {
    return spendableAdventurePoints(state)
  }

  private getDatabase(): Promise<IDBPDatabase<QwertLearnDatabase>> {
    this.databasePromise ??= openDB<QwertLearnDatabase>(this.databaseName, DATABASE_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const runs = database.createObjectStore('runs', { keyPath: 'id' })
          runs.createIndex('by-completed-at', 'completedAt')
          runs.createIndex('by-game', 'gameId')
        }
        if (oldVersion < 2) {
          database.createObjectStore('reward-state', { keyPath: 'id' })
        }
      },
    })
    return this.databasePromise
  }

  private saveRunToMemory(run: RunResult): void {
    if (this.memoryRuns.some((item) => item.id === run.id)) return
    this.memoryRuns.push(run)
    this.memoryRewardState = settleRunReward(this.memoryRewardState, run)
  }

  async saveRun(run: RunResult): Promise<SaveLocation> {
    const normalizedRun = normalizeRun(run)
    if (!canUseIndexedDb()) {
      this.saveRunToMemory(normalizedRun)
      return 'memory'
    }

    try {
      const database = await this.getDatabase()
      const transaction = database.transaction(['runs', 'reward-state'], 'readwrite')
      const runs = transaction.objectStore('runs')
      const existingRun = await runs.get(normalizedRun.id)
      if (!existingRun) {
        const rewardStore = transaction.objectStore('reward-state')
        const rewardState = normalizeRewardState(await rewardStore.get(REWARD_STATE_ID))
        await runs.put(normalizedRun)
        await rewardStore.put(settleRunReward(rewardState, normalizedRun))
      }
      await transaction.done
      return 'indexeddb'
    } catch {
      this.saveRunToMemory(normalizedRun)
      return 'memory'
    }
  }

  async getRewardState(): Promise<RewardState> {
    const fallback = normalizeRewardState(this.memoryRewardState)
    if (!canUseIndexedDb() || this.memoryRewardStateIsSnapshot) return fallback

    try {
      const database = await this.getDatabase()
      const persisted = normalizeRewardState(await database.get('reward-state', REWARD_STATE_ID))
      return hasRewardActivity(fallback) ? mergeRewardStates(persisted, fallback) : persisted
    } catch {
      return fallback
    }
  }

  private async updateRewardState(update: (state: RewardState) => RewardState): Promise<RewardState> {
    if (!canUseIndexedDb()) {
      this.memoryRewardState = normalizeRewardState(update(this.memoryRewardState))
      return normalizeRewardState(this.memoryRewardState)
    }

    let intendedState: RewardState | null = null
    try {
      const database = await this.getDatabase()
      const transaction = database.transaction('reward-state', 'readwrite')
      const store = transaction.objectStore('reward-state')
      const current = normalizeRewardState(await store.get(REWARD_STATE_ID))
      intendedState = normalizeRewardState(update(current))
      await store.put(intendedState)
      await transaction.done
      return normalizeRewardState(intendedState)
    } catch (error) {
      if (error instanceof RewardRuleError) throw error
      if (intendedState) {
        this.memoryRewardState = normalizeRewardState(intendedState)
        this.memoryRewardStateIsSnapshot = true
      } else {
        this.memoryRewardState = normalizeRewardState(update(this.memoryRewardState))
      }
      return normalizeRewardState(this.memoryRewardState)
    }
  }

  async redeemCosmetic(rewardId: string): Promise<RewardState> {
    const now = Date.now()
    const redemptionId = createRedemptionId()
    return this.updateRewardState((state) => redeemCosmeticReward(state, rewardId, redemptionId, now))
  }

  async requestFamilyReward(rewardId: string): Promise<RewardState> {
    const now = Date.now()
    const redemptionId = createRedemptionId()
    return this.updateRewardState((state) => requestFamilyRewardState(state, rewardId, redemptionId, now))
  }

  async resolveFamilyReward(redemptionId: string, approved: boolean): Promise<RewardState> {
    const now = Date.now()
    return this.updateRewardState((state) => resolveFamilyRewardState(state, redemptionId, approved, now))
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
    const runs = ['training', 'frog', 'chase', 'match'].includes(gameId)
      ? await this.listRunsByGame(gameId)
      : await this.listRuns()
    return runs
      .filter((run) => buildLeaderboardKey(run) === boardKey)
      .sort(sortLeaderboard)
      .slice(0, limit)
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [runs, rewardState] = await Promise.all([this.listRuns(), this.getRewardState()])
    if (runs.length === 0) return { ...EMPTY_DASHBOARD, rewardState }

    const words = new Set(runs.flatMap((run) => run.words))
    const wordMemory = buildWordMemory(runs, ALL_VOCABULARY_WORDS)
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
      rewardState,
      highestFrogStage: runs
        .filter((run) => run.gameId === 'frog')
        .reduce((highest, run) => Math.max(highest, run.highestStage ?? 1), 0),
      highestChaseStage: runs
        .filter((run) => run.gameId === 'chase')
        .reduce((highest, run) => Math.max(highest, run.highestStage ?? 1), 0),
      highestMatchStage: runs
        .filter((run) => run.gameId === 'match')
        .reduce((highest, run) => Math.max(highest, run.highestStage ?? 1), 0),
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
    this.memoryRewardState = createEmptyRewardState()
    this.memoryRewardStateIsSnapshot = false
    if (!canUseIndexedDb()) return
    try {
      const database = await this.getDatabase()
      const transaction = database.transaction(['runs', 'reward-state'], 'readwrite')
      await transaction.objectStore('runs').clear()
      await transaction.objectStore('reward-state').clear()
      await transaction.done
    } catch {
      // Memory state is already clear; unavailable IndexedDB needs no further action.
    }
  }
}

export const progressStore = new ProgressStore()
