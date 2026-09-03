import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioSettings } from '../core/audio-service'
import { audioService } from '../core/audio-service'
import { createRunId, type RunResult, type WordEntry } from '../core/models'
import { progressStore } from '../core/progress-store'
import { ActiveRunClock } from '../core/run-clock'
import { useTypingSession } from '../core/use-typing-session'
import type { AppRoute } from '../App'
import { GameShell, ResultOverlay, TypingPrompt } from './GameShell'

interface TrainingPageProps {
  audioSettings: AudioSettings
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

const PATTERNS: WordEntry[] = [
  { id: 'key-fj', text: 'fj', meaning: '左右食指', grade: 4, unit: '键位热身', difficulty: 1, tags: ['home-row'] },
  { id: 'key-dk', text: 'dk', meaning: '左右中指', grade: 4, unit: '键位热身', difficulty: 1, tags: ['home-row'] },
  { id: 'key-sl', text: 'sl', meaning: '左右无名指', grade: 4, unit: '键位热身', difficulty: 1, tags: ['home-row'] },
  { id: 'key-as', text: 'as', meaning: '左手小指与无名指', grade: 4, unit: '键位热身', difficulty: 1, tags: ['home-row'] },
  { id: 'key-jkl', text: 'jkl', meaning: '右手主键位', grade: 4, unit: '键位热身', difficulty: 1, tags: ['home-row'] },
  { id: 'key-asdf', text: 'asdf', meaning: '左手主键位', grade: 4, unit: '键位热身', difficulty: 1, tags: ['home-row'] },
]

export function TrainingPage({ audioSettings, navigate, toggleAudio, onRunSaved }: TrainingPageProps) {
  const [patternIndex, setPatternIndex] = useState(0)
  const [status, setStatus] = useState<'playing' | 'paused' | 'won'>('playing')
  const [storageWarning, setStorageWarning] = useState(false)
  const pattern = PATTERNS[patternIndex]
  const typing = useTypingSession(pattern.text, status === 'playing')
  const runClockRef = useRef(new ActiveRunClock())
  const mistakesRef = useRef(0)
  const mistakeWordIdsRef = useRef<string[]>([])
  const processedSequenceRef = useRef(0)
  const savedRef = useRef(false)

  const finish = useCallback(async () => {
    if (savedRef.current) return
    savedRef.current = true
    const timing = runClockRef.current.finish()
    const run: RunResult = {
      id: createRunId('training'),
      gameId: 'training',
      mode: 'key',
      wordPackId: 'home-row-warmup',
      difficulty: 1,
      speedTier: 1,
      rulesVersion: '1.2.0',
      startedAt: timing.startedAt,
      completedAt: timing.completedAt,
      durationMs: timing.durationMs,
      pausedMs: timing.pausedMs,
      completed: true,
      correctWords: PATTERNS.length,
      correctCharacters: PATTERNS.reduce((sum, item) => sum + item.text.length, 0),
      mistakes: mistakesRef.current,
      maxStreak: PATTERNS.length,
      score: PATTERNS.length * 100,
      words: PATTERNS.map((item) => item.text),
      wordIds: PATTERNS.map((item) => item.id),
      mistakeWordIds: [...mistakeWordIdsRef.current],
      usedFullHints: true,
    }
    const location = await progressStore.saveRun(run)
    if (location === 'memory') setStorageWarning(true)
    await onRunSaved()
  }, [onRunSaved])

  useEffect(() => {
    const event = typing.lastEvent
    if (!event || event.sequence === processedSequenceRef.current) return
    processedSequenceRef.current = event.sequence
    runClockRef.current.start()
    if (event.type === 'correct') audioService.play('typing.correct')
    if (event.type === 'mistake') {
      mistakesRef.current += 1
      mistakeWordIdsRef.current.push(pattern.id)
      audioService.play('typing.wrong')
    }
    if (event.type === 'complete') {
      audioService.play('level.up')
      if (patternIndex === PATTERNS.length - 1) {
        setStatus('won')
        void finish()
      } else {
        window.setTimeout(() => setPatternIndex((value) => value + 1), 220)
      }
    }
  }, [finish, patternIndex, typing.lastEvent])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && status === 'playing') {
        runClockRef.current.pause()
        setStatus('paused')
      } else if (!document.hidden && status === 'paused') {
        runClockRef.current.resume()
        setStatus('playing')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [status])

  const restart = () => {
    runClockRef.current.reset()
    mistakesRef.current = 0
    mistakeWordIdsRef.current = []
    processedSequenceRef.current = 0
    savedRef.current = false
    setStorageWarning(false)
    setPatternIndex(0)
    setStatus('playing')
    typing.reset(PATTERNS[0].text)
  }

  return (
    <GameShell title="键盘训练营" subtitle="主键位热身 · 约 1 分钟" audioSettings={audioSettings} navigate={navigate} toggleAudio={toggleAudio}>
      <main className="training-layout">
        <section className="training-lesson">
          <span className="training-progress">第 {patternIndex + 1} / {PATTERNS.length} 组</span>
          <h1>把食指轻轻放在 F 和 J 上</h1>
          <p>键帽上的小凸点可以帮助你不用低头也找到它们。慢慢输入，先保证准确。</p>
          <div className="hand-guide" aria-hidden="true"><span className="left-hand"><i /><i /><i /><i /></span><div className="home-keys">{[...'asdfjkl'].map((key) => <b className={pattern.text.includes(key) ? 'active' : ''} key={key}>{key}</b>)}</div><span className="right-hand"><i /><i /><i /><i /></span></div>
        </section>
        <TypingPrompt word={pattern} snapshot={typing.snapshot} hintLevel={3} onSpeak={() => audioService.speak(pattern.text)} modeLabel="键位模式" compact />
      </main>
      {storageWarning && <p className="storage-warning" role="status">本次热身暂存在当前页面，请保持页面开启。</p>}
      {status === 'paused' && <ResultOverlay state="paused" title="热身已暂停" detail="页面重新显示后，可以继续当前键位。" onPrimary={() => { runClockRef.current.resume(); setStatus('playing') }} primaryLabel="继续热身" onExit={() => navigate('home')} />}
      {status === 'won' && <ResultOverlay state="won" title="双手准备好了！" detail={`完成 ${PATTERNS.length} 组主键位练习，可以开始游戏。`} onPrimary={() => navigate('frog')} primaryLabel="去池塘冒险" onExit={() => navigate('home')} />}
      {status === 'won' && <button className="sr-only" onClick={restart}>重新热身</button>}
    </GameShell>
  )
}
