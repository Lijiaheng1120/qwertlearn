import { useEffect, useRef, type ReactNode } from 'react'
import type { AudioSettings } from '../core/audio-service'
import { KEYBOARD_ROWS, type WordEntry } from '../core/models'
import type { TypingSnapshot } from '../core/typing-engine'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'

interface GameShellProps {
  title: string
  subtitle: string
  audioSettings: AudioSettings
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  children: ReactNode
}

export function GameShell({ title, subtitle, audioSettings, navigate, toggleAudio, children }: GameShellProps) {
  return (
    <div className="game-app">
      <header className="game-topbar">
        <button className="game-back" onClick={() => navigate('home')}><Icon name="back" />冒险地图</button>
        <div><strong>{title}</strong><small>{subtitle}</small></div>
        <button className="icon-button" onClick={toggleAudio} aria-label={audioSettings.muted ? '打开声音' : '关闭声音'}><Icon name={audioSettings.muted ? 'soundOff' : 'sound'} /></button>
      </header>
      {children}
    </div>
  )
}

interface TypingPromptProps {
  word: WordEntry
  snapshot: TypingSnapshot
  onSpeak: () => void
  modeLabel?: string
  compact?: boolean
  hintLevel?: 0 | 1 | 2 | 3
}

export function TypingPrompt({
  word,
  snapshot,
  onSpeak,
  modeLabel = '抄写模式',
  compact = false,
  hintLevel = 3,
}: TypingPromptProps) {
  const expected = word.text[snapshot.expectedIndex]?.toLowerCase()
  const instruction = snapshot.status === 'complete'
    ? '单词完成，准备前进！'
    : expected && hintLevel >= 1
      ? `在你的实体键盘上按黄色的 ${expected.toUpperCase()} 键`
      : '直接在实体键盘上输入上面的单词。'
  const visibleRows = hintLevel >= 3
    ? KEYBOARD_ROWS
    : hintLevel === 2
      ? KEYBOARD_ROWS.filter((row) => expected && row.includes(expected))
      : []

  return (
    <section className={`typing-prompt ${compact ? 'compact' : ''}`}>
      <div className="prompt-heading">
        <span>{modeLabel}</span>
        <button onClick={onSpeak} aria-label={`播放 ${word.text} 的读音`}><Icon name="sound" />听读音</button>
      </div>
      <div className="word-meaning">{word.meaning}</div>
      <div className="word-letters" aria-label={`请输入单词 ${word.text}`}>
        {[...word.text].map((letter, index) => (
          <span
            className={index < snapshot.typed.length ? 'typed' : index === snapshot.expectedIndex ? 'current' : ''}
            aria-current={index === snapshot.expectedIndex ? 'true' : undefined}
            key={`${letter}-${index}`}
          >{letter}</span>
        ))}
      </div>
      <p className="typing-instruction" aria-live="polite" aria-atomic="true">
        {instruction}
      </p>
      <div className="typing-live-stats" aria-live="off">
        <span>正确率 <b>{Math.round(snapshot.accuracy * 100)}%</b></span>
        <span>错误 <b>{snapshot.errors}</b></span>
        <span>速度 <b>{snapshot.wpm} WPM</b></span>
      </div>
      {visibleRows.length > 0 && (
        <>
          <p className="keyboard-legend">键位提示图：黄色表示现在要按的实体键，不能点击</p>
          <div className={`screen-keyboard hint-level-${hintLevel}`} aria-hidden="true">
            {visibleRows.map((row) => (
              <div className={`keyboard-row row-${KEYBOARD_ROWS.indexOf(row)}`} key={row.join('')}>
                {row.map((key) => <i className={key === expected ? 'active' : ''} key={key}>{key}</i>)}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

interface ResultOverlayProps {
  state: 'paused' | 'won' | 'lost'
  title: string
  detail: string
  onPrimary: () => void
  primaryLabel: string
  onExit: () => void
}

export function ResultOverlay({ state, title, detail, onPrimary, primaryLabel, onExit }: ResultOverlayProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    primaryButtonRef.current?.focus()
  }, [])

  return (
    <div
      className={`result-overlay ${state}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      aria-describedby="result-detail"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onExit()
      }}
    >
      <div className="result-card">
        <span className="result-symbol"><Icon name={state === 'won' ? 'trophy' : state === 'paused' ? 'pause' : 'heart'} /></span>
        <h2 id="result-title">{title}</h2>
        <p id="result-detail">{detail}</p>
        <button ref={primaryButtonRef} className="primary-action" onClick={onPrimary}>{primaryLabel}<Icon name="arrow" /></button>
        <button className="text-action" onClick={onExit}>返回冒险地图</button>
      </div>
    </div>
  )
}
