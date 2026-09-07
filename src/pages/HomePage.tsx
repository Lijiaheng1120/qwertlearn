import type { AudioSettings } from '../core/audio-service'
import type { DashboardSummary } from '../core/models'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'

interface HomePageProps {
  summary: DashboardSummary
  audioSettings: AudioSettings
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
}

export function HomePage({ summary, audioSettings, navigate, toggleAudio }: HomePageProps) {
  const accuracyLabel = summary.recentRuns.length === 0 ? '—' : `${Math.round(summary.accuracy * 100)}%`
  const practicedMinutes = Math.min(8, summary.todayMinutes)
  const goalProgress = `${practicedMinutes === 0 ? 0 : practicedMinutes * 12.5}%`

  // 新游戏只需追加到数组末尾，现有站点顺序和编号保持稳定。
  const adventureStops = [
    {
      route: 'frog',
      cardClassName: 'pond-location',
      tagClassName: 'recommended',
      tag: '池塘岛 · 初级速度',
      title: '青蛙跳荷叶',
      description: '打对单词，帮助青蛙稳稳跳到下一片荷叶。',
      action: '开始冒险',
      artwork: <span className="pond-art" aria-hidden="true"><i className="frog-face" /><i className="lily-word">cat</i></span>,
    },
    {
      route: 'match',
      cardClassName: 'garden-location',
      tagClassName: 'garden',
      tag: summary.highestMatchStage > 0 ? `花园岛 · 最高第 ${summary.highestMatchStage} 关` : '花园岛 · 可选等级',
      title: '词语花园连连看',
      description: '找出英文与中文伙伴，让花园逐关盛开。',
      action: '开始配对',
      artwork: <span className="match-garden-art" aria-hidden="true"><i>teacher</i><i>老师</i><b>🌼</b></span>,
    },
    {
      route: 'spell',
      cardClassName: 'spell-location',
      tagClassName: 'spell',
      tag: summary.highestSpellStage > 0 ? `列车岛 · 最高第 ${summary.highestSpellStage} 站` : '列车岛 · 四档词库',
      title: '字母小火车',
      description: '根据中文和乱序字母，独立拼出完整英文。',
      action: '开始拼写',
      artwork: <span className="spell-map-art" aria-hidden="true"><b>c</b><b>a</b><b>t</b><i>拼</i></span>,
    },
    {
      route: 'chase',
      cardClassName: 'city-location',
      tagClassName: 'chase',
      tag: summary.bestChaseMs ? `城市岛 · 最佳 ${Math.round(summary.bestChaseMs / 1000)} 秒` : '城市岛 · 新任务',
      title: '城市追踪战',
      description: '连续输入单词，一点一点追回城市徽章。',
      action: '开始追踪',
      artwork: <span className="city-art" aria-hidden="true"><i /><i /><i /><b /></span>,
    },
  ] as const

  return (
    <div className="storybook-app">
      <header className="storybook-topbar">
        <button className="brand-button" onClick={() => navigate('home')} aria-label="返回冒险地图">
          <span className="brand-mark"><Icon name="keyboard" /></span>
          <span>QwertLearn</span>
        </button>

        <nav className="storybook-nav" aria-label="主要导航">
          <button className="active" onClick={() => navigate('home')}>冒险地图</button>
          <button onClick={() => navigate('wordbook')}>我的单词本</button>
          <button onClick={() => navigate('rewards')}>成长奖励</button>
          <button onClick={() => navigate('parent')}>学习记录</button>
        </nav>

        <div className="top-actions">
          <button className="icon-button" onClick={toggleAudio} aria-label={audioSettings.muted ? '打开声音' : '关闭声音'}>
            <Icon name={audioSettings.muted ? 'soundOff' : 'sound'} />
          </button>
          <button className="profile-button" onClick={() => navigate('parent')}>
            <span className="avatar">小Q</span>
            <span>小探险家</span>
          </button>
        </div>
      </header>

      <main className="storybook-content">
        <section className="storybook-hero">
          <div>
            <p className="eyebrow">今日冒险 · 第 {Math.max(1, summary.practiceDays)} 天</p>
            <h1>沿着单词路线出发吧</h1>
            <p>{adventureStops.length} 座小岛都已开放，选择今天最想挑战的一站。准确比速度更重要，选错也可以继续修正。</p>
          </div>
          <div className="daily-card" aria-label={`今日目标已完成 ${practicedMinutes} 分钟，共 8 分钟`}>
            <div><strong>今日目标</strong><span>{practicedMinutes} / 8 分钟</span></div>
            <div className="progress-track"><i style={{ width: goalProgress }} /></div>
          </div>
        </section>

        <section className="adventure-map adventure-route" aria-label="游戏成长路线">
          <div className="music-mood"><Icon name="music" />提示音与单词朗读</div>
          <span className="map-sun" />
          <span className="map-mountain mountain-one" />
          <span className="map-mountain mountain-two" />

          <div
            className="adventure-route-scroll"
            role="region"
            aria-label="横向成长路线，可左右滑动查看更多游戏"
            tabIndex={0}
          >
            <ol className="adventure-route-list">
              {adventureStops.map((stop, index) => (
                <li className="route-stop" key={stop.route}>
                  <button
                    className={`map-location route-location ${stop.cardClassName}`}
                    onClick={() => navigate(stop.route)}
                  >
                    <span className="route-step" aria-hidden="true">{index + 1}</span>
                    {stop.artwork}
                    <span className={`location-tag ${stop.tagClassName}`}>{stop.tag}</span>
                    <h2>{stop.title}</h2>
                    <p>{stop.description}</p>
                    <span className="location-cta">{stop.action} <b><Icon name="arrow" /></b></span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <p className="route-scroll-note">沿路线向右探索，新的冒险岛会继续接在后面 <span aria-hidden="true">→</span></p>
        </section>

        <section className="home-reward-entry" aria-label="成长奖励概览">
          <span className="reward-entry-art" aria-hidden="true">🎒</span>
          <div>
            <small>成长岛奖励柜</small>
            <h2>你有 {summary.rewardState.balance} 冒险积分</h2>
            <p>青蛙最高阶段 {summary.highestFrogStage} · 城市最高街区 {summary.highestChaseStage} · 花园最高第 {summary.highestMatchStage} 关 · 小火车最高第 {summary.highestSpellStage} 站。积分可以换外观，也可以提交家庭愿望。</p>
          </div>
          <button onClick={() => navigate('rewards')}>打开奖励柜 <Icon name="arrow" /></button>
        </section>

        <section className="home-stats" aria-label="学习概览">
          <button className="home-stat-card" onClick={() => navigate('wordbook')}>
            <span className="stat-icon green"><Icon name="book" /></span>
            <span><strong>我的单词本</strong><small>看看今天有哪些单词准备再次开花。</small></span>
            <b>{summary.wrongWordCount}</b><em>待复习</em>
          </button>
          <button className="home-stat-card" onClick={() => navigate('parent')}>
            <span className="stat-icon yellow"><Icon name="star" /></span>
            <span><strong>连续练习</strong><small>少量多次，不因中断惩罚。</small></span>
            <b>{summary.practiceDays} 天</b><em>轻松坚持</em>
          </button>
          <button className="home-stat-card" onClick={() => navigate('parent')}>
            <span className="stat-icon blue"><Icon name="chart" /></span>
            <span><strong>我的进步</strong><small>详细数据只在本机保存。</small></span>
            <b>{accuracyLabel}</b><em>正确率</em>
          </button>
        </section>
      </main>
    </div>
  )
}
