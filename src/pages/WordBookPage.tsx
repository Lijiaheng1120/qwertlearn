import { useState } from 'react'
import type { AudioSettings } from '../core/audio-service'
import type { DashboardSummary, WordMemory } from '../core/models'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'

interface WordBookPageProps {
  summary: DashboardSummary
  audioSettings: AudioSettings
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
}

function reviewPriority(left: WordMemory, right: WordMemory): number {
  if (left.cleanStreak !== right.cleanStreak) return left.cleanStreak - right.cleanStreak
  if (left.mistakeCount !== right.mistakeCount) return right.mistakeCount - left.mistakeCount
  return (right.lastMistakeAt ?? right.lastPracticedAt) - (left.lastMistakeAt ?? left.lastPracticedAt)
}

function formatPracticeDate(timestamp: number): string {
  if (timestamp <= 0) return '还没有记录'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  }).format(timestamp)
}

function childReviewLabel(word: WordMemory): string {
  return word.cleanStreak === 0 ? '今天重点' : '再答对一次'
}

export function WordBookPage({ summary, audioSettings, navigate, toggleAudio }: WordBookPageProps) {
  const [showParentDetails, setShowParentDetails] = useState(false)
  const reviewWords = [...summary.wordMemory]
    .filter((word) => word.needsReview)
    .sort(reviewPriority)
    .slice(0, 3)
  const practicedWords = [...summary.wordMemory].sort((left, right) => {
    if (left.needsReview !== right.needsReview) return left.needsReview ? -1 : 1
    return right.lastPracticedAt - left.lastPracticedAt
  })
  const stableWordCount = summary.wordMemory.filter((word) => !word.needsReview && word.completedCount > 0).length
  const routeProgress = reviewWords.length === 0
    ? 100
    : Math.round((reviewWords.reduce((sum, word) => sum + Math.min(2, word.cleanStreak), 0) / (reviewWords.length * 2)) * 100)

  return (
    <div className="wordbook-app">
      <header className="storybook-topbar wordbook-topbar">
        <button className="brand-button" onClick={() => navigate('home')} aria-label="返回冒险地图">
          <span className="brand-mark"><Icon name="keyboard" /></span>
          <span>QwertLearn</span>
        </button>

        <nav className="storybook-nav" aria-label="主要导航">
          <button onClick={() => navigate('home')}>冒险地图</button>
          <button className="active" onClick={() => navigate('wordbook')}>记忆花园</button>
          <button onClick={() => navigate('parent')}>家长中心</button>
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

      <main className="wordbook-content">
        <section className="wordbook-hero">
          <div>
            <span className="wordbook-tag">我的单词本 · 记忆花园</span>
            <h1>让错词慢慢开花</h1>
            <p>每次只复习一小组。答对两次后，它会离开待复习区，把位置让给新单词。</p>
          </div>
          <div className="wordbook-garden" aria-hidden="true">
            <i className="garden-hill hill-left" />
            <i className="garden-hill hill-right" />
            <span className="garden-flower flower-one">🌼</span>
            <span className="garden-flower flower-two">🌷</span>
            <span className="garden-flower flower-three">🌱</span>
          </div>
        </section>

        <div className="wordbook-grid">
          <section className="wordbook-panel wordbook-route-panel" aria-labelledby="review-route-title">
            <header className="wordbook-panel-header">
              <div>
                <span>儿童复习路线</span>
                <h2 id="review-route-title">今天的 {reviewWords.length || '轻松'} 词任务</h2>
              </div>
              <button
                className="wordbook-parent-toggle"
                type="button"
                aria-expanded={showParentDetails}
                aria-controls="parent-word-details"
                onClick={() => setShowParentDetails((visible) => !visible)}
              >
                <Icon name="parent" />
                {showParentDetails ? '收起家长明细' : '查看家长明细'}
              </button>
            </header>

            {reviewWords.length > 0 ? (
              <>
                <div className="review-route" aria-label="待复习单词路线">
                  {reviewWords.map((word, index) => (
                    <div className="review-route-step" key={word.wordId}>
                      {index > 0 && <span className="review-arrow" aria-hidden="true">→</span>}
                      <article className={index === 0 ? 'active' : ''}>
                        <small>{childReviewLabel(word)}</small>
                        <strong>{word.text}</strong>
                        <span>{word.meaning}</span>
                      </article>
                    </div>
                  ))}
                </div>
                <div className="wordbook-progress-label">
                  <span>开花进度</span><strong>{routeProgress}%</strong>
                </div>
                <div className="wordbook-progress" role="progressbar" aria-label="复习路线开花进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={routeProgress}>
                  <i style={{ width: `${routeProgress}%` }} />
                </div>
                <button className="wordbook-primary" onClick={() => navigate('frog')}>
                  开始混合复习 <Icon name="arrow" />
                </button>
                <p className="wordbook-launch-note">待复习词会优先进入下一局，同时保留新词探索，不会形成固定重复队列。</p>
              </>
            ) : (
              <div className="wordbook-empty">
                <span aria-hidden="true">🌻</span>
                <h3>今天没有待复习词</h3>
                <p>记忆花园状态很好！可以开始一局新冒险，继续发现新单词。</p>
                <button className="wordbook-primary" onClick={() => navigate('frog')}>
                  去发现新单词 <Icon name="arrow" />
                </button>
              </div>
            )}

            <div className="wordbook-rule">
              <Icon name="star" />
              <p><strong>记忆规则</strong>答错或超时会加入待复习；连续两次无错后自动移出。历史记录只在这台设备保存。</p>
            </div>
          </section>

          <aside className="wordbook-panel wordbook-overview" aria-labelledby="memory-overview-title">
            <header className="wordbook-panel-header">
              <div><span>本机学习记忆</span><h2 id="memory-overview-title">记忆概览</h2></div>
              <b>{summary.wordMemory.length} 个词</b>
            </header>
            <div className="wordbook-summary-list">
              <div className="needs-review"><span>待复习</span><strong>{summary.wrongWordCount}</strong><small>会优先回到游戏</small></div>
              <div className="practiced"><span>已练习</span><strong>{summary.wordMemory.length}</strong><small>跨游戏共享记录</small></div>
              <div className="stable"><span>已稳定</span><strong>{stableWordCount}</strong><small>最近可以先休息</small></div>
            </div>
            <p className="wordbook-privacy"><Icon name="book" />儿童层只展示鼓励式任务；错误次数和练习日期在家长明细中查看。</p>
          </aside>
        </div>

        {showParentDetails && (
          <section id="parent-word-details" className="wordbook-parent-panel" aria-labelledby="parent-details-title">
            <header>
              <div><span>家长层 · 本机数据</span><h2 id="parent-details-title">单词记忆明细</h2></div>
              <p>用于了解复习原因，不向孩子强调错误次数。</p>
            </header>
            {practicedWords.length > 0 ? (
              <div className="wordbook-table-wrap">
                <table>
                  <thead><tr><th scope="col">单词</th><th scope="col">状态</th><th scope="col">错误</th><th scope="col">连续无错</th><th scope="col">完成</th><th scope="col">最近练习</th></tr></thead>
                  <tbody>
                    {practicedWords.map((word) => (
                      <tr key={word.wordId}>
                        <th scope="row"><strong>{word.text}</strong><small>{word.meaning}</small></th>
                        <td><span className={word.needsReview ? 'memory-status review' : 'memory-status stable'}>{word.needsReview ? '待复习' : '已稳定'}</span></td>
                        <td>{word.mistakeCount} 次</td>
                        <td>{Math.min(word.cleanStreak, 2)} / 2</td>
                        <td>{word.completedCount} 次</td>
                        <td>{formatPracticeDate(word.lastPracticedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="wordbook-parent-empty">完成第一局后，这里会显示每个单词的本地记忆记录。</div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
