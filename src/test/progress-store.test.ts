import { openDB, type DBSchema } from 'idb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildLeaderboardKey, createRunId, type RunResult } from '../core/models'
import { ProgressStore } from '../core/progress-store'

let databaseSequence = 0

interface LegacyDatabase extends DBSchema {
  runs: {
    key: string
    value: RunResult
    indexes: {
      'by-completed-at': number
      'by-game': string
    }
  }
}

function createStore(): ProgressStore {
  databaseSequence += 1
  return new ProgressStore(`qwertlearn-test-${databaseSequence}`)
}

function createRun(overrides: Partial<RunResult> = {}): RunResult {
  return {
    id: createRunId('frog'),
    gameId: 'frog',
    mode: 'copy',
    wordPackId: 'experience-grade-4',
    difficulty: 1,
    speedTier: 1,
    rulesVersion: '1.2.0',
    startedAt: Date.now() - 60_000,
    completedAt: Date.now(),
    durationMs: 60_000,
    pausedMs: 0,
    completed: true,
    correctWords: 2,
    correctCharacters: 7,
    mistakes: 1,
    maxStreak: 2,
    score: 250,
    words: ['cat', 'book'],
    wordIds: ['exp-cat', 'exp-book'],
    mistakeWordIds: ['exp-cat'],
    usedFullHints: true,
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ProgressStore', () => {
  it('persists through IndexedDB and aggregates active practice time', async () => {
    const store = createStore()
    expect(await store.saveRun(createRun())).toBe('indexeddb')

    const summary = await store.getDashboardSummary()
    expect(summary.masteredWords).toBe(2)
    expect(summary.wrongWordCount).toBe(1)
    expect(summary.wordMemory).toEqual(expect.arrayContaining([
      expect.objectContaining({ wordId: 'exp-cat', mistakeCount: 1, needsReview: true }),
      expect.objectContaining({ wordId: 'exp-book', completedCount: 1, needsReview: false }),
    ]))
    expect(summary.totalMinutes).toBe(1)
    expect(summary.todayMinutes).toBe(1)
    expect(summary.bestFrogStreak).toBe(2)
    expect(summary.bestFrogBoardKey).toBe(buildLeaderboardKey(summary.recentRuns[0]))
    expect(summary.accuracy).toBeCloseTo(7 / 8)
    expect(summary.rewardState).toMatchObject({ balance: 16, lifetimeEarned: 16 })
    expect(summary.rewardState.settledRunIds).toHaveLength(1)
    expect(summary.highestFrogStage).toBe(1)
    expect(summary.highestChaseStage).toBe(0)
    expect(summary.highestMatchStage).toBe(0)
  })

  it('falls back to instance-local memory when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const first = createStore()
    const second = createStore()

    expect(await first.saveRun(createRun({ id: 'memory-only' }))).toBe('memory')
    expect((await first.listRuns()).map((run) => run.id)).toEqual(['memory-only'])
    expect((await first.getRewardState()).balance).toBe(16)
    expect(await second.listRuns()).toEqual([])
    expect((await second.getRewardState()).balance).toBe(0)
  })

  it('settles points once and persists an idempotent cosmetic redemption', async () => {
    const store = createStore()
    const highValueRun = (id: string) => createRun({
      id,
      correctWords: 10_000,
      correctCharacters: 50_000,
      mistakes: 0,
      maxStreak: 10_000,
    })

    await store.saveRun(highValueRun('reward-run-1'))
    await store.saveRun(highValueRun('reward-run-1'))
    await store.saveRun(highValueRun('reward-run-2'))
    expect(await store.getRewardState()).toMatchObject({ balance: 1_000, lifetimeEarned: 1_000 })

    const redeemed = await store.redeemCosmetic('frog-starlight')
    expect(redeemed.balance).toBe(200)
    expect(redeemed.ownedRewardIds).toEqual(['frog-starlight'])
    expect(redeemed.equippedRewards.frogSkin).toBe('frog-starlight')

    const duplicate = await store.redeemCosmetic('frog-starlight')
    expect(duplicate.balance).toBe(200)
    expect(duplicate.redemptions).toHaveLength(1)
  })

  it('keeps family reward points reserved until a parent confirms', async () => {
    const store = createStore()
    for (const id of ['family-run-1', 'family-run-2', 'family-run-3']) {
      await store.saveRun(createRun({ id, correctWords: 10_000, correctCharacters: 50_000, mistakes: 0 }))
    }

    const pending = await store.requestFamilyReward('family-notebook')
    const request = pending.redemptions.find((item) => item.rewardId === 'family-notebook')!
    expect(pending.balance).toBe(1_500)
    expect(request.status).toBe('pending')
    await expect(store.redeemCosmetic('frog-starlight')).rejects.toThrow('可用积分不足')

    const approved = await store.resolveFamilyReward(request.id, true)
    expect(approved.balance).toBe(0)
    expect(approved.redemptions.find((item) => item.id === request.id)?.status).toBe('fulfilled')
    expect((await store.getDashboardSummary()).rewardState.balance).toBe(0)
  })

  it('upgrades a version-one database without losing run history', async () => {
    databaseSequence += 1
    const databaseName = `qwertlearn-v1-${databaseSequence}`
    const legacyDatabase = await openDB<LegacyDatabase>(databaseName, 1, {
      upgrade(database) {
        const runs = database.createObjectStore('runs', { keyPath: 'id' })
        runs.createIndex('by-completed-at', 'completedAt')
        runs.createIndex('by-game', 'gameId')
      },
    })
    await legacyDatabase.put('runs', createRun({ id: 'version-one-run', completedAt: 1_000 }))
    legacyDatabase.close()

    const upgradedStore = new ProgressStore(databaseName)
    expect((await upgradedStore.listRuns()).map((item) => item.id)).toEqual(['version-one-run'])
    await upgradedStore.saveRun(createRun({ id: 'version-two-run', completedAt: 2_000 }))
    expect((await upgradedStore.listRuns()).map((item) => item.id)).toEqual(['version-two-run', 'version-one-run'])
    expect((await upgradedStore.getRewardState()).settledRunIds).toEqual(['version-two-run'])
  })

  it('isolates frog boards and orders the matching board by score', async () => {
    const store = createStore()
    const base = createRun({ id: 'frog-low', score: 200, durationMs: 55_000 })
    const high = createRun({ id: 'frog-high', score: 400, durationMs: 65_000 })
    const otherTier = createRun({ id: 'frog-tier-2', score: 900, difficulty: 2, speedTier: 2 })
    await store.saveRun(base)
    await store.saveRun(high)
    await store.saveRun(otherTier)

    const board = await store.getLeaderboard(buildLeaderboardKey(base))
    expect(board.map((run) => run.id)).toEqual(['frog-high', 'frog-low'])
  })

  it('persists advanced matching runs and aggregates their stage and word memory', async () => {
    const store = createStore()
    const matchRun = createRun({
      id: 'match-grade5',
      gameId: 'match',
      mode: 'recall',
      wordPackId: 'fltrp-grade5-v1',
      rulesVersion: '1.0.0',
      highestStage: 3,
      correctWords: 1,
      correctCharacters: 1,
      mistakes: 1,
      words: ['airport'],
      wordIds: ['g5-airport'],
      mistakeWordIds: ['g5-airport'],
      score: 900,
    })
    await store.saveRun(matchRun)

    expect((await store.listRunsByGame('match')).map((run) => run.id)).toEqual(['match-grade5'])
    expect((await store.getLeaderboard(buildLeaderboardKey(matchRun))).map((run) => run.id)).toEqual(['match-grade5'])
    const summary = await store.getDashboardSummary()
    expect(summary.highestMatchStage).toBe(3)
    expect(summary.wordMemory).toContainEqual(expect.objectContaining({
      wordId: 'g5-airport',
      mistakeCount: 1,
      needsReview: true,
    }))
  })

  it('orders successful chase runs by active time and failed runs by remaining distance', async () => {
    const store = createStore()
    const slow = createRun({ id: 'chase-slow', gameId: 'chase', durationMs: 40_000, score: 900, remainingDistance: 0 })
    const fast = createRun({ id: 'chase-fast', gameId: 'chase', durationMs: 30_000, score: 600, remainingDistance: 0 })
    const failed = createRun({ id: 'chase-failed', gameId: 'chase', completed: false, score: 2_000, remainingDistance: 1 })
    await store.saveRun(slow)
    await store.saveRun(fast)
    await store.saveRun(failed)

    const board = await store.getLeaderboard(buildLeaderboardKey(slow))
    expect(board.map((run) => run.id)).toEqual(['chase-fast', 'chase-slow', 'chase-failed'])
  })

  it('computes displayed personal bests only within the latest comparable board', async () => {
    const store = createStore()
    const now = Date.now()
    const olderTier = createRun({ id: 'frog-old-tier', completedAt: now - 2_000, maxStreak: 99 })
    const latestTier = createRun({
      id: 'frog-latest-tier',
      completedAt: now,
      difficulty: 2,
      speedTier: 2,
      maxStreak: 3,
    })
    const olderChase = createRun({
      id: 'chase-old-tier',
      gameId: 'chase',
      completedAt: now - 2_000,
      durationMs: 5_000,
      remainingDistance: 0,
    })
    const latestChase = createRun({
      id: 'chase-latest-tier',
      gameId: 'chase',
      completedAt: now + 1_000,
      difficulty: 2,
      speedTier: 2,
      durationMs: 25_000,
      remainingDistance: 0,
    })
    await store.saveRun(olderTier)
    await store.saveRun(latestTier)
    await store.saveRun(olderChase)
    await store.saveRun(latestChase)

    const summary = await store.getDashboardSummary()
    expect(summary.bestFrogStreak).toBe(3)
    expect(summary.bestFrogBoardKey).toBe(buildLeaderboardKey(latestTier))
    expect(summary.bestChaseMs).toBe(25_000)
    expect(summary.bestChaseBoardKey).toBe(buildLeaderboardKey(latestChase))
  })

  it('supports by-game lookup, board limits, legacy defaults, and clearing', async () => {
    const store = createStore()
    const legacy = createRun({ id: 'legacy-frog', completedAt: Date.now() - 1_000 })
    delete (legacy as Partial<RunResult>).pausedMs
    delete (legacy as Partial<RunResult>).usedFullHints
    delete (legacy as Partial<RunResult>).wordIds
    delete (legacy as Partial<RunResult>).mistakeWordIds
    const second = createRun({ id: 'second-frog', score: 100 })
    const chase = createRun({ id: 'only-chase', gameId: 'chase', remainingDistance: 0 })

    await store.saveRun(legacy)
    await store.saveRun(second)
    await store.saveRun(chase)

    expect((await store.listRunsByGame('chase')).map((run) => run.id)).toEqual(['only-chase'])
    expect(await store.getLeaderboard(buildLeaderboardKey(second), 1)).toHaveLength(1)
    expect((await store.listRuns()).find((run) => run.id === 'legacy-frog')).toMatchObject({
      pausedMs: 0,
      usedFullHints: true,
      wordIds: [],
      mistakeWordIds: [],
    })

    await store.clear()
    expect(await store.listRuns()).toEqual([])
    expect(await store.getRewardState()).toMatchObject({ balance: 0, lifetimeEarned: 0 })
    expect((await store.getRewardState()).redemptions).toEqual([])
  })
})
