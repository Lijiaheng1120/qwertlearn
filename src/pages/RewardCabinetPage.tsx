import { useEffect, useMemo, useState } from 'react'
import type { AudioSettings } from '../core/audio-service'
import type { DashboardSummary, RewardDefinition, RewardState } from '../core/models'
import { progressStore } from '../core/progress-store'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'

interface RewardCabinetPageProps {
  summary: DashboardSummary
  audioSettings: AudioSettings
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRewardChanged: () => Promise<void>
}

const REWARD_ART: Record<string, string> = {
  'frog-starlight': '🐸',
  'lily-emerald': '🪷',
  'city-sunset': '🌇',
  'family-notebook': '📓',
  'family-color-pens': '🖍️',
  'family-cash': '¥',
}

function redemptionLabel(status: 'pending' | 'fulfilled' | 'rejected'): string {
  if (status === 'pending') return '等待家长确认'
  if (status === 'fulfilled') return '已经兑现'
  return '本次未批准'
}

export function RewardCabinetPage({
  summary,
  audioSettings,
  navigate,
  toggleAudio,
  onRewardChanged,
}: RewardCabinetPageProps) {
  const [rewardState, setRewardState] = useState<RewardState>(summary.rewardState)
  const [cashAmountYuan, setCashAmountYuan] = useState(1)
  const [busyRewardId, setBusyRewardId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const catalog = progressStore.getRewardCatalog()
  const spendable = progressStore.getSpendableAdventurePoints(rewardState)
  const reserved = Math.max(0, rewardState.balance - spendable)
  const cashPolicy = progressStore.getCashRewardPolicy(rewardState)
  const pendingCashRequest = rewardState.redemptions.find((item) => item.cashAmountYuan != null && item.status === 'pending')
  const selectedCashAmount = pendingCashRequest?.cashAmountYuan ?? Math.min(
    Math.max(1, cashAmountYuan),
    Math.max(1, cashPolicy.maxRequestYuan),
  )
  const cashCost = pendingCashRequest?.cost ?? selectedCashAmount * cashPolicy.pointsPerYuan
  const cashBusy = busyRewardId === 'cash-request'
  const cashRequestDisabled = cashBusy || Boolean(pendingCashRequest) || cashPolicy.maxRequestYuan < 1
  const cashButtonLabel = pendingCashRequest
    ? '等待家长确认'
    : cashPolicy.remainingBudgetYuan < 1
      ? '本周额度已用完'
      : cashPolicy.maxRequestYuan < 1
        ? `还差 ${Math.max(0, cashPolicy.pointsPerYuan - spendable)} 分`
        : '请家长确认'

  useEffect(() => setRewardState(summary.rewardState), [summary.rewardState])

  const pendingRewardIds = useMemo(() => new Set(
    rewardState.redemptions
      .filter((item) => item.kind === 'family' && item.status === 'pending')
      .map((item) => item.rewardId),
  ), [rewardState.redemptions])

  const equippedRewardIds = useMemo(
    () => new Set(Object.values(rewardState.equippedRewards).filter((value): value is string => Boolean(value))),
    [rewardState.equippedRewards],
  )

  const performRewardAction = async (reward: RewardDefinition) => {
    setBusyRewardId(reward.id)
    setNotice(null)
    setError(null)
    try {
      const nextState = reward.kind === 'cosmetic'
        ? await progressStore.redeemCosmetic(reward.id)
        : await progressStore.requestFamilyReward(reward.id)
      setRewardState(nextState)
      setNotice(reward.kind === 'cosmetic'
        ? `${reward.name}已经放进背包并自动装备。`
        : `${reward.name}愿望已经送到家长中心，确认前不会扣积分。`)
      await onRewardChanged()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '奖励操作暂时没有完成，请稍后重试。')
    } finally {
      setBusyRewardId(null)
    }
  }

  const performCashRequest = async () => {
    const amountYuan = selectedCashAmount
    setBusyRewardId('cash-request')
    setNotice(null)
    setError(null)
    try {
      const nextState = await progressStore.requestCashReward(amountYuan)
      setRewardState(nextState)
      setNotice(`¥${amountYuan} 现金愿望已送到家长中心，已保留 ${amountYuan * cashPolicy.pointsPerYuan} 积分，确认前不会扣除。`)
      await onRewardChanged()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '现金愿望暂时没有提交成功，请稍后重试。')
    } finally {
      setBusyRewardId(null)
    }
  }

  const renderReward = (reward: RewardDefinition) => {
    const owned = rewardState.ownedRewardIds.includes(reward.id)
    const equipped = equippedRewardIds.has(reward.id)
    const pending = pendingRewardIds.has(reward.id)
    const insufficient = spendable < reward.cost
    const busy = busyRewardId === reward.id
    const disabled = busy || owned || pending || insufficient
    const buttonLabel = owned
      ? equipped ? '已拥有并装备' : '已经拥有'
      : pending
        ? '等待家长确认'
        : insufficient
          ? `还差 ${reward.cost - spendable} 分`
          : reward.kind === 'cosmetic'
            ? '兑换并装备'
            : '提交家庭愿望'

    return (
      <article className={`reward-card ${reward.kind}`} key={reward.id}>
        <span className="reward-art" aria-hidden="true">{REWARD_ART[reward.id] ?? '🎁'}</span>
        <div className="reward-card-copy">
          <span className="reward-kind">{reward.kind === 'cosmetic' ? '虚拟外观' : '家庭奖励'}</span>
          <h3>{reward.name}</h3>
          <p>{reward.description}</p>
          <strong>{reward.cost} 冒险积分</strong>
        </div>
        <button disabled={disabled} onClick={() => void performRewardAction(reward)}>
          {busy ? '处理中…' : buttonLabel}
        </button>
      </article>
    )
  }

  const cosmeticRewards = catalog.filter((reward) => reward.kind === 'cosmetic')
  const familyRewards = catalog.filter((reward) => reward.kind === 'family')
  const recentRedemptions = [...rewardState.redemptions].reverse().slice(0, 6)

  return (
    <div className="reward-cabinet-app">
      <header className="reward-topbar">
        <button className="game-back" onClick={() => navigate('home')}><Icon name="back" />冒险地图</button>
        <div><strong>成长岛奖励柜</strong><small>练习获得积分，奖励不会改变游戏难度</small></div>
        <button className="icon-button" onClick={toggleAudio} aria-label={audioSettings.muted ? '打开声音' : '关闭声音'}><Icon name={audioSettings.muted ? 'soundOff' : 'sound'} /></button>
      </header>

      <main className="reward-cabinet-content">
        <section className="reward-hero">
          <div>
            <p className="eyebrow">双轨成长 · 本机保存</p>
            <h1>把每次认真练习，变成看得见的收获</h1>
            <p>外观兑换会立即装备；本子、彩色笔和现金都只是家庭愿望，必须由家长在本机确认。</p>
          </div>
          <div className="points-wallet" aria-label={`积分余额 ${rewardState.balance}，可用 ${spendable}`}>
            <span><Icon name="star" />冒险积分</span>
            <strong>{rewardState.balance}</strong>
            <small>可用 {spendable}{reserved > 0 ? ` · 待确认保留 ${reserved}` : ''}</small>
          </div>
          <div className="growth-highlights">
            <span><b>{summary.highestFrogStage}</b><small>青蛙最高阶段</small></span>
            <span><b>{summary.highestChaseStage}</b><small>城市最高街区</small></span>
            <span><b>{rewardState.lifetimeEarned}</b><small>累计获得积分</small></span>
          </div>
        </section>

        {(notice || error) && <p className={`reward-notice ${error ? 'error' : ''}`} role="status">{error ?? notice}</p>}

        <section className="reward-section" aria-labelledby="virtual-rewards-title">
          <header><div><span>立即兑换</span><h2 id="virtual-rewards-title">冒险外观</h2></div><p>只改变颜色和主题，不增加时间、生命或排行榜优势。</p></header>
          <div className="reward-grid">{cosmeticRewards.map(renderReward)}</div>
        </section>

        <section className="reward-section cash-reward-section" aria-labelledby="cash-reward-title">
          <header>
            <div><span>家长线下兑现</span><h2 id="cash-reward-title">积分兑换现金愿望</h2></div>
            <strong className="cash-rate-badge">{cashPolicy.pointsPerYuan} 积分 = ¥1</strong>
          </header>
          <div className="cash-request-card">
            <div className="cash-request-copy">
              <span>申请现金奖励</span>
              <h3>选择金额，再请家长同意</h3>
              <p>每周最多 ¥{cashPolicy.weeklyBudgetYuan}，本周还剩 ¥{cashPolicy.remainingBudgetYuan}。提交后只是先留住积分，不会马上拿到钱；家长同意时才扣积分。</p>
              <dl>
                <div><dt>当前可用</dt><dd>{spendable} 积分</dd></div>
                <div><dt>本次需要</dt><dd>{cashCost} 积分</dd></div>
              </dl>
            </div>
            <div className="cash-request-controls">
              <div className="cash-stepper" aria-label="选择现金愿望金额">
                <button
                  aria-label="减少一元"
                  disabled={Boolean(pendingCashRequest) || selectedCashAmount <= 1}
                  onClick={() => setCashAmountYuan((amount) => Math.max(1, amount - 1))}
                >−</button>
                <div className="cash-value" aria-live="polite"><strong>¥{selectedCashAmount}</strong><small>{cashCost} 积分</small></div>
                <button
                  aria-label="增加一元"
                  disabled={Boolean(pendingCashRequest) || selectedCashAmount >= cashPolicy.maxRequestYuan}
                  onClick={() => setCashAmountYuan((amount) => Math.min(cashPolicy.maxRequestYuan, amount + 1))}
                >＋</button>
              </div>
              <button className="cash-submit" disabled={cashRequestDisabled} onClick={() => void performCashRequest()}>
                {cashBusy ? '提交中…' : cashButtonLabel}
              </button>
            </div>
            <p className="cash-safety-note">
              <strong>这不是马上付款：</strong>系统不会自动转账，也不用填写收款账号或地址；家长同意后由家长在线下兑现。
              {!pendingCashRequest && cashPolicy.maxRequestYuan < 1 && cashPolicy.remainingBudgetYuan > 0
                && <span>先完成练习，赚够 {cashPolicy.pointsPerYuan} 积分就能申请 ¥1。</span>}
            </p>
          </div>
        </section>

        <section className="reward-section family-shelf" aria-labelledby="family-rewards-title">
          <header><div><span>需要家长确认</span><h2 id="family-rewards-title">家庭愿望</h2></div><p>提交时只保留可用积分；家长批准后才真正扣除。</p></header>
          <div className="reward-grid family">{familyRewards.map(renderReward)}</div>
        </section>

        <section className="reward-history" aria-labelledby="reward-history-title">
          <header><h2 id="reward-history-title">最近记录</h2><button onClick={() => navigate('parent')}>请家长处理愿望 <Icon name="arrow" /></button></header>
          {recentRedemptions.length === 0
            ? <p className="reward-history-empty">还没有兑换记录。先完成一局至少 3 秒的有效练习来获得积分。</p>
            : <ul>{recentRedemptions.map((item) => (
                <li key={item.id}><span>{REWARD_ART[item.rewardId] ?? '🎁'}</span><div><strong>{item.rewardName}</strong><small>{redemptionLabel(item.status)}</small></div><b>{item.cost} 分</b></li>
              ))}</ul>}
        </section>
      </main>
    </div>
  )
}
