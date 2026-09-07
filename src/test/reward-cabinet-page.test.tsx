import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_DASHBOARD, type RewardState } from '../core/models'
import { progressStore } from '../core/progress-store'
import { RewardCabinetPage } from '../pages/RewardCabinetPage'

const audioSettings = { muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }

function rewardState(balance: number): RewardState {
  return {
    ...EMPTY_DASHBOARD.rewardState,
    balance,
    lifetimeEarned: balance,
  }
}

afterEach(() => vi.restoreAllMocks())

describe('RewardCabinetPage', () => {
  it('redeems a cosmetic through ProgressStore and shows its equipped state', async () => {
    const initial = rewardState(900)
    const redeemed: RewardState = {
      ...initial,
      balance: 100,
      ownedRewardIds: ['frog-starlight'],
      equippedRewards: { frogSkin: 'frog-starlight' },
      redemptions: [{
        id: 'cosmetic-1', rewardId: 'frog-starlight', rewardName: '星光青蛙', kind: 'cosmetic',
        cost: 800, status: 'fulfilled', requestedAt: 1, resolvedAt: 1,
      }],
    }
    const redeem = vi.spyOn(progressStore, 'redeemCosmetic').mockResolvedValue(redeemed)
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(
      <RewardCabinetPage
        summary={{ ...EMPTY_DASHBOARD, rewardState: initial, highestFrogStage: 3 }}
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRewardChanged={refresh}
      />,
    )

    const card = screen.getByRole('heading', { name: '星光青蛙' }).closest('article')!
    fireEvent.click(within(card).getByRole('button', { name: '兑换并装备' }))

    await waitFor(() => expect(redeem).toHaveBeenCalledWith('frog-starlight'))
    expect(await screen.findByRole('status')).toHaveTextContent('已经放进背包并自动装备')
    expect(within(card).getByRole('button', { name: '已拥有并装备' })).toBeDisabled()
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('submits a variable cash wish at 1,000 points per yuan without immediate deduction', async () => {
    const initial = rewardState(3_000)
    const pending: RewardState = {
      ...initial,
      redemptions: [{
        id: 'cash-1', rewardId: 'family-cash', rewardName: '现金奖励 ¥2', kind: 'family',
        cost: 2_000, status: 'pending', requestedAt: 2, resolvedAt: null,
        cashAmountYuan: 2, cashRatePointsPerYuan: 1_000,
      }],
    }
    const request = vi.spyOn(progressStore, 'requestCashReward').mockResolvedValue(pending)
    render(
      <RewardCabinetPage
        summary={{ ...EMPTY_DASHBOARD, rewardState: initial }}
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRewardChanged={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    const cashSection = screen.getByRole('heading', { name: '积分兑换现金愿望' }).closest('section')!
    expect(within(cashSection).getByText('1000 积分 = ¥1')).toBeInTheDocument()
    expect(within(cashSection).getByText(/每周最多 ¥10，本周还剩 ¥10/)).toBeInTheDocument()
    expect(within(cashSection).getByText(/不会马上拿到钱/)).toBeInTheDocument()
    const increase = within(cashSection).getByRole('button', { name: '增加一元' })
    const decrease = within(cashSection).getByRole('button', { name: '减少一元' })
    fireEvent.click(increase)
    fireEvent.click(increase)
    expect(within(cashSection).getByText('¥3')).toBeInTheDocument()
    fireEvent.click(decrease)
    expect(within(cashSection).getByText('¥2')).toBeInTheDocument()
    fireEvent.click(within(cashSection).getByRole('button', { name: '请家长确认' }))

    await waitFor(() => expect(request).toHaveBeenCalledWith(2))
    expect(await screen.findByRole('status')).toHaveTextContent('已保留 2000 积分，确认前不会扣除')
    expect(screen.getByLabelText('积分余额 3000，可用 1000')).toBeInTheDocument()
    expect(within(cashSection).getByRole('button', { name: '等待家长确认' })).toBeDisabled()
  })

  it('submits a family wish without deducting points before parent approval', async () => {
    const initial = rewardState(1_600)
    const pending: RewardState = {
      ...initial,
      redemptions: [{
        id: 'family-1', rewardId: 'family-notebook', rewardName: '新练习本', kind: 'family',
        cost: 1_500, status: 'pending', requestedAt: 2, resolvedAt: null,
      }],
    }
    const request = vi.spyOn(progressStore, 'requestFamilyReward').mockResolvedValue(pending)
    render(
      <RewardCabinetPage
        summary={{ ...EMPTY_DASHBOARD, rewardState: initial }}
        audioSettings={audioSettings}
        navigate={vi.fn()}
        toggleAudio={vi.fn()}
        onRewardChanged={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    const card = screen.getByRole('heading', { name: '新练习本' }).closest('article')!
    fireEvent.click(within(card).getByRole('button', { name: '提交家庭愿望' }))

    await waitFor(() => expect(request).toHaveBeenCalledWith('family-notebook'))
    expect(await screen.findByRole('status')).toHaveTextContent('确认前不会扣积分')
    expect(screen.getByLabelText('积分余额 1600，可用 100')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: '等待家长确认' })).toBeDisabled()
  })
})
