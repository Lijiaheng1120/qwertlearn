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

  return (
    <div className="storybook-app">
      <header className="storybook-topbar">
        <button className="brand-button" onClick={() => navigate('home')} aria-label="返回冒险地图">
          <span className="brand-mark"><Icon name="keyboard" /></span>
          <span>QwertLearn</span>
        </button>

        <nav className="storybook-nav" aria-label="主要导航">
          <button className="active" onClick={() => navigate('home')}>冒险地图</button>
          <button onClick={() => navigate('training')}>键位训练</button>
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
            <h1>准备好用单词开启新旅程了吗？</h1>
            <p>先热身一分钟，再选择池塘、词语花园或城市。准确比速度更重要，选错也可以继续修正。</p>
          </div>
          <div className="daily-card" aria-label={`今日目标已完成 ${practicedMinutes} 分钟，共 8 分钟`}>
            <div><strong>今日目标</strong><span>{practicedMinutes} / 8 分钟</span></div>
            <div className="progress-track"><i style={{ width: goalProgress }} /></div>
          </div>
        </section>

        <section className="adventure-map" aria-label="游戏冒险地图">
          <div className="music-mood"><Icon name="music" />提示音与单词朗读</div>
          <span className="map-sun" />
          <span className="map-mountain mountain-one" />
          <span className="map-mountain mountain-two" />
          <span className="map-river" />
          <span className="map-road" />
          <svg className="map-path" viewBox="0 0 1300 500" aria-hidden="true">
            <path d="M320 352C447 306 443 202 575 181C721 160 794 297 947 309" />
          </svg>

          <button className="map-location training-location" onClick={() => navigate('training')}>
            <span className="location-tag warm">建议先开始 · 1 分钟</span>
            <h2>键盘训练营</h2>
            <p>找到 F 和 J，让双手准备出发。</p>
            <span className="location-cta">继续热身 <b><Icon name="arrow" /></b></span>
          </button>

          <button className="map-location pond-location" onClick={() => navigate('frog')}>
            <span className="pond-art" aria-hidden="true"><i className="frog-face" /><i className="lily-word">cat</i></span>
            <span className="location-tag recommended">池塘任务 · 初级速度</span>
            <h2>青蛙跳荷叶</h2>
            <p>打对单词，帮助青蛙稳稳跳到下一片荷叶。</p>
            <span className="location-cta">开始池塘冒险 <b><Icon name="arrow" /></b></span>
          </button>

          <button className="map-location garden-location" onClick={() => navigate('match')}>
            <span className="match-garden-art" aria-hidden="true"><i>teacher</i><i>老师</i><b>🌼</b></span>
            <span className="location-tag garden">{summary.highestMatchStage > 0 ? `最高第 ${summary.highestMatchStage} 关` : '新游戏 · 可选等级'}</span>
            <h2>词语花园连连看</h2>
            <p>用鼠标或触控找出英文与中文伙伴，让花园逐关盛开。</p>
            <span className="location-cta">开始词义配对 <b><Icon name="arrow" /></b></span>
          </button>

          <button className="map-location city-location" onClick={() => navigate('chase')}>
            <span className="city-art" aria-hidden="true"><i /><i /><i /><b /></span>
            <span className="location-tag chase">{summary.bestChaseMs ? `最佳 ${Math.round(summary.bestChaseMs / 1000)} 秒` : '新任务'}</span>
            <h2>城市追踪战</h2>
            <p>准确输入每个单词，一点一点追回城市徽章。</p>
            <span className="location-cta">开始城市任务 <b><Icon name="arrow" /></b></span>
          </button>
        </section>

        <section className="home-reward-entry" aria-label="成长奖励概览">
          <span className="reward-entry-art" aria-hidden="true">🎒</span>
          <div>
            <small>成长岛奖励柜</small>
            <h2>你有 {summary.rewardState.balance} 冒险积分</h2>
            <p>青蛙最高阶段 {summary.highestFrogStage} · 城市最高街区 {summary.highestChaseStage} · 花园最高第 {summary.highestMatchStage} 关。积分可以换外观，也可以提交家庭愿望。</p>
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
