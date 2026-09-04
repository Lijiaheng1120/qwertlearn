import { describe, expect, it } from 'vitest'
import type { RunResult } from '../core/models'
import {
  calculateRunRewardBreakdown,
  createEmptyRewardState,
  redeemCosmeticReward,
  requestFamilyReward,
  resolveFamilyReward,
  settleRunReward,
  spendableAdventurePoints,
} from '../core/reward-system'

function run(overrides: Partial<RunResult> = {}): RunResult {
  return {
    id: 'run-1',
    gameId: 'frog',
    mode: 'copy',
    wordPackId: 'experience-grade-4',
    difficulty: 1,
    speedTier: 1,
    rulesVersion: '1.3.0',
    startedAt: 1_000,
    completedAt: 61_000,
    durationMs: 60_000,
    pausedMs: 0,
    completed: true,
    correctWords: 8,
    correctCharacters: 40,
    mistakes: 0,
    maxStreak: 8,
    score: 1_000,
    words: ['cat'],
    usedFullHints: true,
    ...overrides,
  }
}

describe('reward system', () => {
  it('calculates a transparent learning-run breakdown', () => {
    expect(calculateRunRewardBreakdown(run())).toEqual({
      basePoints: 32,
      stageBonus: 0,
      badgeBonus: 0,
      accuracyBonus: 15,
      multiplier: 1,
      total: 47,
    })
  })

  it('rewards endless stages and recovered badges with a bounded multiplier', () => {
    expect(calculateRunRewardBreakdown(run({
      challengeMode: 'endless',
      speedTier: 3,
      correctWords: 16,
      correctCharacters: 80,
      mistakes: 4,
      startStage: 1,
      highestStage: 3,
      badgesRecovered: 2,
    }))).toEqual({
      basePoints: 64,
      stageBonus: 36,
      badgeBonus: 50,
      accuracyBonus: 15,
      multiplier: 1.45,
      total: 239,
    })
  })

  it('requires meaningful play and caps points from one run', () => {
    expect(calculateRunRewardBreakdown(run({ durationMs: 2_999 })).total).toBe(0)
    expect(calculateRunRewardBreakdown(run({ correctWords: 0 })).total).toBe(0)
    expect(calculateRunRewardBreakdown(run({
      challengeMode: 'endless',
      speedTier: 5,
      correctWords: 10_000,
      correctCharacters: 50_000,
      highestStage: 100,
      badgesRecovered: 100,
    })).total).toBe(500)
  })

  it('settles each run id exactly once', () => {
    const first = settleRunReward(createEmptyRewardState(), run())
    const duplicate = settleRunReward(first, run({ correctWords: 99 }))

    expect(first.balance).toBe(47)
    expect(first.lifetimeEarned).toBe(47)
    expect(first.settledRunIds).toEqual(['run-1'])
    expect(duplicate).toEqual(first)
  })

  it('reserves family reward points until a parent resolves the request', () => {
    const funded = { ...createEmptyRewardState(), balance: 2_000, lifetimeEarned: 2_000 }
    const pending = requestFamilyReward(funded, 'family-notebook', 'request-1', 10)

    expect(pending.balance).toBe(2_000)
    expect(spendableAdventurePoints(pending)).toBe(500)
    expect(pending.redemptions[0]).toMatchObject({ status: 'pending', resolvedAt: null })
    expect(() => redeemCosmeticReward(pending, 'frog-starlight', 'skin-blocked', 11)).toThrow('可用积分不足')

    const rejected = resolveFamilyReward(pending, 'request-1', false, 12)
    expect(rejected.balance).toBe(2_000)
    expect(rejected.redemptions[0].status).toBe('rejected')
  })

  it('deducts approved rewards and makes cosmetic redemption idempotent', () => {
    const funded = { ...createEmptyRewardState(), balance: 3_000, lifetimeEarned: 3_000 }
    const skin = redeemCosmeticReward(funded, 'frog-starlight', 'skin-1', 10)
    const duplicateSkin = redeemCosmeticReward(skin, 'frog-starlight', 'skin-2', 11)
    const pending = requestFamilyReward(duplicateSkin, 'family-notebook', 'request-2', 12)
    const approved = resolveFamilyReward(pending, 'request-2', true, 13)

    expect(skin.balance).toBe(2_200)
    expect(skin.ownedRewardIds).toEqual(['frog-starlight'])
    expect(skin.equippedRewards.frogSkin).toBe('frog-starlight')
    expect(duplicateSkin).toEqual(skin)
    expect(approved.balance).toBe(700)
    expect(approved.redemptions.at(-1)).toMatchObject({ status: 'fulfilled', resolvedAt: 13 })
  })
})
