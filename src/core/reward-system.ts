import type {
  CashRewardPolicy,
  RewardDefinition,
  RewardRedemption,
  RewardSlot,
  RewardState,
  RunResult,
  RunRewardBreakdown,
} from './models'

export const REWARD_RULES_VERSION = '1.0.0'
export const REWARD_STATE_ID = 'local'
export const MIN_REWARD_DURATION_MS = 3_000
export const MAX_POINTS_PER_RUN = 500
export const CASH_REWARD_ID = 'family-cash'
export const CASH_POINTS_PER_YUAN = 1_000
export const CASH_WEEKLY_BUDGET_YUAN = 10

export class RewardRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RewardRuleError'
  }
}

export const REWARD_CATALOG: readonly RewardDefinition[] = [
  {
    id: 'frog-starlight',
    name: '星光青蛙',
    description: '紫色星光外观，仅改变青蛙造型。',
    kind: 'cosmetic',
    cost: 800,
    slot: 'frogSkin',
  },
  {
    id: 'lily-emerald',
    name: '翡翠荷叶',
    description: '为池塘换上翡翠色荷叶主题。',
    kind: 'cosmetic',
    cost: 500,
    slot: 'lilyTheme',
  },
  {
    id: 'city-sunset',
    name: '落日城市',
    description: '为城市追踪更换落日背景。',
    kind: 'cosmetic',
    cost: 700,
    slot: 'cityTheme',
  },
  {
    id: 'family-notebook',
    name: '新练习本',
    description: '提交家庭奖励愿望，由家长线下确认。',
    kind: 'family',
    cost: 1_500,
  },
  {
    id: 'family-color-pens',
    name: '彩色笔奖励',
    description: '提交家庭奖励愿望，由家长线下确认。',
    kind: 'family',
    cost: 1_200,
  },
]

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function cloneRedemption(redemption: RewardRedemption): RewardRedemption {
  return { ...redemption }
}

export function createEmptyRewardState(): RewardState {
  return {
    id: REWARD_STATE_ID,
    balance: 0,
    lifetimeEarned: 0,
    settledRunIds: [],
    ownedRewardIds: [],
    equippedRewards: {},
    redemptions: [],
  }
}

export function normalizeRewardState(state?: Partial<RewardState> | null): RewardState {
  const empty = createEmptyRewardState()
  if (!state) return empty
  return {
    id: REWARD_STATE_ID,
    balance: Math.max(0, Number.isFinite(state.balance) ? Math.round(state.balance!) : 0),
    lifetimeEarned: Math.max(0, Number.isFinite(state.lifetimeEarned) ? Math.round(state.lifetimeEarned!) : 0),
    settledRunIds: unique(Array.isArray(state.settledRunIds) ? state.settledRunIds : []),
    ownedRewardIds: unique(Array.isArray(state.ownedRewardIds) ? state.ownedRewardIds : []),
    equippedRewards: state.equippedRewards ? { ...state.equippedRewards } : {},
    redemptions: Array.isArray(state.redemptions) ? state.redemptions.map(cloneRedemption) : [],
  }
}

export function mergeRewardStates(primary: RewardState, fallback: RewardState): RewardState {
  const left = normalizeRewardState(primary)
  const right = normalizeRewardState(fallback)
  const redemptions = new Map(left.redemptions.map((item) => [item.id, item]))
  for (const item of right.redemptions) redemptions.set(item.id, item)
  return {
    id: REWARD_STATE_ID,
    balance: left.balance + right.balance,
    lifetimeEarned: left.lifetimeEarned + right.lifetimeEarned,
    settledRunIds: unique([...left.settledRunIds, ...right.settledRunIds]),
    ownedRewardIds: unique([...left.ownedRewardIds, ...right.ownedRewardIds]),
    equippedRewards: { ...left.equippedRewards, ...right.equippedRewards },
    redemptions: [...redemptions.values()].map(cloneRedemption),
  }
}

export function calculateRunRewardBreakdown(run: RunResult): RunRewardBreakdown {
  if (run.correctWords <= 0 || run.durationMs < MIN_REWARD_DURATION_MS) {
    return { basePoints: 0, stageBonus: 0, badgeBonus: 0, accuracyBonus: 0, multiplier: 1, total: 0 }
  }

  const attempts = Math.max(0, run.correctCharacters) + Math.max(0, run.mistakes)
  const accuracy = attempts === 0 ? 1 : Math.max(0, run.correctCharacters) / attempts
  const basePoints = Math.max(0, run.correctWords) * 4
  const startStage = Math.max(1, run.startStage ?? 1)
  const highestStage = Math.max(startStage, run.highestStage ?? startStage)
  const stageBonus = run.highestStage == null ? 0 : (highestStage - startStage + 1) * 12
  const badgeBonus = Math.max(0, run.badgesRecovered ?? 0) * 25
  const accuracyBonus = accuracy >= 0.95 ? 15 : accuracy >= 0.85 ? 8 : 0
  const tierMultiplier = 1 + Math.max(0, Math.min(4, run.speedTier - 1)) * 0.08
  const challengeMultiplier = run.challengeMode === 'endless' ? 1.25 : 1
  const multiplier = Number((tierMultiplier * challengeMultiplier).toFixed(2))
  const total = Math.min(
    MAX_POINTS_PER_RUN,
    Math.max(0, Math.round((basePoints + stageBonus + badgeBonus + accuracyBonus) * multiplier)),
  )

  return { basePoints, stageBonus, badgeBonus, accuracyBonus, multiplier, total }
}

export function calculateRunAdventurePoints(run: RunResult): number {
  return calculateRunRewardBreakdown(run).total
}

export function settleRunReward(state: RewardState, run: RunResult): RewardState {
  const current = normalizeRewardState(state)
  if (current.settledRunIds.includes(run.id)) return current
  const points = run.rewardRulesVersion === REWARD_RULES_VERSION && Number.isFinite(run.adventurePointsEarned)
    ? Math.max(0, Math.min(MAX_POINTS_PER_RUN, Math.round(run.adventurePointsEarned!)))
    : calculateRunAdventurePoints(run)
  return {
    ...current,
    balance: current.balance + points,
    lifetimeEarned: current.lifetimeEarned + points,
    settledRunIds: [...current.settledRunIds, run.id],
  }
}

export function findReward(rewardId: string): RewardDefinition {
  const reward = REWARD_CATALOG.find((item) => item.id === rewardId)
  if (!reward) throw new RewardRuleError('奖励不存在')
  return reward
}

export function pendingFamilyCost(state: RewardState): number {
  return state.redemptions
    .filter((redemption) => redemption.kind === 'family' && redemption.status === 'pending')
    .reduce((sum, redemption) => sum + redemption.cost, 0)
}

export function spendableAdventurePoints(state: RewardState): number {
  return Math.max(0, state.balance - pendingFamilyCost(state))
}

function startOfLocalWeek(timestamp: number): number {
  const date = new Date(timestamp)
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysSinceMonday)
  return date.getTime()
}

function cashAmountYuan(redemption: RewardRedemption): number {
  const rate = Number.isFinite(redemption.cashRatePointsPerYuan) && redemption.cashRatePointsPerYuan! > 0
    ? Math.round(redemption.cashRatePointsPerYuan!)
    : CASH_POINTS_PER_YUAN
  const amount = Number.isFinite(redemption.cashAmountYuan)
    ? Math.round(redemption.cashAmountYuan!)
    : Math.round(redemption.cost / rate)
  return Math.max(0, amount)
}

export function getCashRewardPolicy(state: RewardState, timestamp: number): CashRewardPolicy {
  const current = normalizeRewardState(state)
  const weekStart = startOfLocalWeek(timestamp)
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1_000
  const fulfilledThisWeekYuan = current.redemptions
    .filter((item) => item.rewardId === CASH_REWARD_ID
      && item.status === 'fulfilled'
      && item.resolvedAt != null
      && item.resolvedAt >= weekStart
      && item.resolvedAt < weekEnd)
    .reduce((sum, item) => sum + cashAmountYuan(item), 0)
  const remainingBudgetYuan = Math.max(0, CASH_WEEKLY_BUDGET_YUAN - fulfilledThisWeekYuan)
  return {
    pointsPerYuan: CASH_POINTS_PER_YUAN,
    weeklyBudgetYuan: CASH_WEEKLY_BUDGET_YUAN,
    fulfilledThisWeekYuan,
    remainingBudgetYuan,
    maxRequestYuan: Math.max(0, Math.min(
      remainingBudgetYuan,
      Math.floor(spendableAdventurePoints(current) / CASH_POINTS_PER_YUAN),
    )),
  }
}

export function requestCashReward(
  state: RewardState,
  amountYuan: number,
  redemptionId: string,
  timestamp: number,
): RewardState {
  const current = normalizeRewardState(state)
  if (!Number.isInteger(amountYuan) || amountYuan < 1) {
    throw new RewardRuleError('现金愿望金额必须是正整数')
  }
  if (current.redemptions.some((item) => item.rewardId === CASH_REWARD_ID && item.status === 'pending')) {
    throw new RewardRuleError('已有一笔现金愿望等待家长确认')
  }
  const cost = amountYuan * CASH_POINTS_PER_YUAN
  if (spendableAdventurePoints(current) < cost) throw new RewardRuleError('可用积分不足')
  const policy = getCashRewardPolicy(current, timestamp)
  if (amountYuan > policy.remainingBudgetYuan) throw new RewardRuleError('超过本周剩余现金预算')

  return {
    ...current,
    redemptions: [
      ...current.redemptions,
      {
        id: redemptionId,
        rewardId: CASH_REWARD_ID,
        rewardName: `现金奖励 ¥${amountYuan}`,
        kind: 'family',
        cost,
        status: 'pending',
        requestedAt: timestamp,
        resolvedAt: null,
        cashAmountYuan: amountYuan,
        cashRatePointsPerYuan: CASH_POINTS_PER_YUAN,
      },
    ],
  }
}

export function redeemCosmeticReward(
  state: RewardState,
  rewardId: string,
  redemptionId: string,
  timestamp: number,
): RewardState {
  const current = normalizeRewardState(state)
  const reward = findReward(rewardId)
  if (reward.kind !== 'cosmetic' || !reward.slot) throw new RewardRuleError('该奖励不能直接兑换')
  if (current.ownedRewardIds.includes(reward.id)) return current
  if (spendableAdventurePoints(current) < reward.cost) throw new RewardRuleError('可用积分不足')

  return {
    ...current,
    balance: current.balance - reward.cost,
    ownedRewardIds: [...current.ownedRewardIds, reward.id],
    equippedRewards: { ...current.equippedRewards, [reward.slot]: reward.id },
    redemptions: [
      ...current.redemptions,
      {
        id: redemptionId,
        rewardId: reward.id,
        rewardName: reward.name,
        kind: reward.kind,
        cost: reward.cost,
        status: 'fulfilled',
        requestedAt: timestamp,
        resolvedAt: timestamp,
      },
    ],
  }
}

export function requestFamilyReward(
  state: RewardState,
  rewardId: string,
  redemptionId: string,
  timestamp: number,
): RewardState {
  const current = normalizeRewardState(state)
  const reward = findReward(rewardId)
  if (reward.kind !== 'family') throw new RewardRuleError('该奖励不需要家长确认')
  if (current.redemptions.some((item) => item.rewardId === reward.id && item.status === 'pending')) {
    throw new RewardRuleError('该奖励已有待确认申请')
  }
  if (spendableAdventurePoints(current) < reward.cost) throw new RewardRuleError('可用积分不足')

  return {
    ...current,
    redemptions: [
      ...current.redemptions,
      {
        id: redemptionId,
        rewardId: reward.id,
        rewardName: reward.name,
        kind: reward.kind,
        cost: reward.cost,
        status: 'pending',
        requestedAt: timestamp,
        resolvedAt: null,
      },
    ],
  }
}

export function resolveFamilyReward(
  state: RewardState,
  redemptionId: string,
  approved: boolean,
  timestamp: number,
): RewardState {
  const current = normalizeRewardState(state)
  const redemption = current.redemptions.find((item) => item.id === redemptionId)
  if (!redemption || redemption.kind !== 'family') throw new RewardRuleError('家庭奖励申请不存在')
  if (redemption.status !== 'pending') return current
  if (approved && current.balance < redemption.cost) throw new RewardRuleError('积分余额不足')

  return {
    ...current,
    balance: approved ? current.balance - redemption.cost : current.balance,
    redemptions: current.redemptions.map((item) => item.id === redemptionId
      ? { ...item, status: approved ? 'fulfilled' : 'rejected', resolvedAt: timestamp }
      : item),
  }
}

export function equippedRewardForSlot(state: RewardState, slot: RewardSlot): string | null {
  return state.equippedRewards[slot] ?? null
}
