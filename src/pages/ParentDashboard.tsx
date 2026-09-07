import { useEffect, useState } from 'react'
import { audioService, type AudioSettings } from '../core/audio-service'
import type { DashboardSummary } from '../core/models'
import { progressStore } from '../core/progress-store'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'

interface ParentDashboardProps {
  summary: DashboardSummary
  audioSettings: AudioSettings
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRewardChanged: () => Promise<void>
}

export function ParentDashboard({ summary, audioSettings, navigate, toggleAudio, onRewardChanged }: ParentDashboardProps) {
  const accuracyLabel = summary.recentRuns.length === 0 ? '—' : `${Math.round(summary.accuracy * 100)}%`
  const totalMinutes = Math.max(0, summary.todayMinutes)
  const goalPercent = Math.min(100, Math.round((Math.min(8, totalMinutes) / 8) * 100))
  const weekBars = [42, 58, 49, Math.max(18, Math.min(66, totalMinutes * 6)), 18, 18, 18]
  const [rewardState, setRewardState] = useState(summary.rewardState)
  const [busyRedemptionId, setBusyRedemptionId] = useState<string | null>(null)
  const [rewardNotice, setRewardNotice] = useState<string | null>(null)
  const pendingFamilyRewards = rewardState.redemptions.filter((item) => item.kind === 'family' && item.status === 'pending')

  useEffect(() => setRewardState(summary.rewardState), [summary.rewardState])

  const openFamilyRewards = () => {
    const panel = document.getElementById('family-rewards')
    panel?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    panel?.focus()
  }

  const resolveFamilyReward = async (redemptionId: string, approved: boolean) => {
    const request = rewardState.redemptions.find((item) => item.id === redemptionId)
    setBusyRedemptionId(redemptionId)
    setRewardNotice(null)
    try {
      const nextState = await progressStore.resolveFamilyReward(redemptionId, approved)
      setRewardState(nextState)
      setRewardNotice(approved
        ? request?.cashAmountYuan != null
          ? `现金愿望已确认，${request.cost} 积分已经扣除，请家长线下兑现 ¥${request.cashAmountYuan}。`
          : '家庭奖励已确认，积分已经扣除。'
        : '申请已拒绝，本次没有扣除积分。')
      await onRewardChanged()
    } catch (error) {
      setRewardNotice(error instanceof Error ? error.message : '处理申请时出现问题，请稍后重试。')
    } finally {
      setBusyRedemptionId(null)
    }
  }

  const openSoundSettings = () => {
    const panel = document.getElementById('sound-settings')
    panel?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    panel?.focus()
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <button className="dashboard-brand" onClick={() => navigate('home')}>
          <span><Icon name="keyboard" /></span>QwertLearn
        </button>
        <p className="nav-label">学习空间</p>
        <nav className="dashboard-nav">
          <button className="active" onClick={() => navigate('parent')}><Icon name="home" />今日学习</button>
          <button onClick={() => navigate('wordbook')}><Icon name="book" />我的单词本 <small>{summary.wrongWordCount} 个待复习</small></button>
          <button onClick={openFamilyRewards}><Icon name="star" />家庭奖励 <small>{pendingFamilyRewards.length} 个待确认</small></button>
          <button disabled aria-label="学习记录，开发中"><Icon name="chart" />学习记录 <small>开发中</small></button>
          <button onClick={openSoundSettings}><Icon name={audioSettings.muted ? 'soundOff' : 'sound'} />声音设置</button>
        </nav>
        <div className="sidebar-goal">
          <strong>今日还差 {Math.max(0, 8 - Math.min(8, totalMinutes))} 分钟</strong>
          <p>完成后会获得一枚池塘探索贴纸。</p>
          <div><i style={{ width: `${goalPercent}%` }} /></div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><small>本机家庭档案 · 数据不会上传</small><h1>下午好，小探险家</h1></div>
          <button className="return-map" onClick={() => navigate('home')}><Icon name="back" />返回冒险地图</button>
        </header>

        <section className="continue-panel">
          <div>
            <span>推荐继续 · 抄写模式</span>
            <h2>从下一片荷叶继续今天的练习</h2>
            <p>体验词库准备了 12 个四年级基础词。先看清楚，再准确地打出来。</p>
            <button onClick={() => navigate('frog')}>继续青蛙跳荷叶 <Icon name="arrow" /></button>
          </div>
          <div className="dashboard-pond" aria-hidden="true">
            <i className="dash-lily one" /><i className="dash-lily two">green</i><i className="dash-frog" />
            <small>提示音 · 音量 {Math.round(audioSettings.sfx * 100)}%</small>
          </div>
        </section>

        <div className="dashboard-section-title"><h3>其他练习</h3><span>所有模式共享学习进度</span></div>
        <section className="dashboard-practice-grid">
          <button className="practice-card" onClick={() => navigate('training')}>
            <span className="practice-icon"><Icon name="keyboard" /></span>
            <span><strong>键盘训练营</strong><small>1 分钟找到 F、J 和今天要用的字母。</small><em>开始热身 →</em></span>
            <span className="mini-keys" aria-hidden="true">{[0,1,2,3,4,5,6,7,8].map((key) => <i className={key === 4 || key === 5 ? 'hot' : ''} key={key} />)}</span>
          </button>
          <button className="practice-card orange" onClick={() => navigate('chase')}>
            <span className="practice-icon"><Icon name="trophy" /></span>
            <span><strong>城市追踪战</strong><small>输入正确单词，追回被拿走的城市徽章。</small><em>{summary.bestChaseMs ? `最佳 ${Math.round(summary.bestChaseMs / 1000)} 秒 →` : '开始首次追踪 →'}</em></span>
            <span className="mini-city" aria-hidden="true"><i /><i /></span>
          </button>
        </section>

        <section id="family-rewards" className="family-approval-panel" tabIndex={-1} aria-labelledby="family-approval-title">
          <header>
            <div><span>仅在本机处理</span><h3 id="family-approval-title">家庭奖励确认</h3></div>
            <strong>余额 {rewardState.balance} 分</strong>
          </header>
          <p>孩子只能提交愿望。批准后才扣除积分；现金由家长线下兑现，系统不会自动转账，也不收集儿童账户、地址或收款信息。</p>
          {rewardNotice && <p className="family-reward-notice" role="status">{rewardNotice}</p>}
          {pendingFamilyRewards.length === 0
            ? <div className="family-reward-empty">当前没有待确认愿望。<button onClick={() => navigate('rewards')}>查看孩子的奖励柜</button></div>
            : <div className="family-request-list">{pendingFamilyRewards.map((request) => (
                <article key={request.id}>
                  <span aria-hidden="true">{request.cashAmountYuan != null ? '¥' : '🎁'}</span>
                  <div>
                    <strong>{request.rewardName}</strong>
                    <small>{request.cashAmountYuan != null
                      ? `现金 ¥${request.cashAmountYuan} · ${request.cashRatePointsPerYuan ?? 1_000} 积分/元 · 共需 ${request.cost} 积分`
                      : `需要 ${request.cost} 积分`} · 申请后积分仍未扣除</small>
                  </div>
                  <div className="family-request-actions">
                    <button disabled={busyRedemptionId === request.id} onClick={() => void resolveFamilyReward(request.id, false)} aria-label={`拒绝 ${request.rewardName}`}>拒绝</button>
                    <button
                      disabled={busyRedemptionId === request.id}
                      onClick={() => void resolveFamilyReward(request.id, true)}
                      aria-label={request.cashAmountYuan != null ? `批准并线下兑现 ${request.rewardName}` : `批准 ${request.rewardName}`}
                    >{request.cashAmountYuan != null ? '批准并线下兑现' : '批准并扣分'}</button>
                  </div>
                </article>
              ))}</div>}
        </section>
      </main>

      <aside className="dashboard-right">
        <section className="local-profile"><span>小Q</span><div><strong>小探险家</strong><small>四年级体验词库</small></div><b>本地</b></section>
        <section className="right-panel">
          <header><h3>今日目标</h3><span>{Math.min(8, totalMinutes)} / 8 分钟</span></header>
          <div className="goal-ring" style={{ '--progress': `${goalPercent}%` } as React.CSSProperties}><div><strong>{goalPercent}%</strong><small>已完成</small></div></div>
        </section>
        <section className="right-panel">
          <header><h3>本周练习</h3><span>少量多次</span></header>
          <div className="week-bars">{weekBars.map((height, index) => <span key={index}><i className={index === 3 ? 'today' : index < summary.practiceDays ? 'done' : ''} style={{ height }} /><small>{'一二三四五六日'[index]}</small></span>)}</div>
        </section>
        <section id="sound-settings" className="right-panel" tabIndex={-1}>
          <header><h3>声音</h3><button onClick={toggleAudio}>{audioSettings.muted ? '打开' : '关闭'}</button></header>
          <div className="audio-setting"><span><Icon name={audioSettings.muted ? 'soundOff' : 'sound'} /></span><div><strong>提示音</strong><small>按键反馈与成功提示</small></div><input aria-label="提示音音量" type="range" min="0" max="1" step="0.05" value={audioSettings.sfx} disabled={audioSettings.muted} onChange={(event) => audioService.setChannel('sfx', Number(event.target.value))} /></div>
        </section>
        <section className="right-panel compact-stats"><div><strong>{summary.masteredWords}</strong><small>练习单词</small></div><div><strong>{accuracyLabel}</strong><small>正确率</small></div><div><strong>{summary.bestFrogStreak}</strong><small>最佳连跳</small></div></section>
      </aside>
    </div>
  )
}
