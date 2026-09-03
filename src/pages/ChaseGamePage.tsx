import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioSettings } from '../core/audio-service'
import { audioService } from '../core/audio-service'
import { adaptDifficulty, createRunId, EXPERIENCE_WORDS, INITIAL_DIFFICULTY, type RunResult, type WordMemory } from '../core/models'
import { progressStore } from '../core/progress-store'
import { ActiveRunClock } from '../core/run-clock'
import { useTypingSession } from '../core/use-typing-session'
import { createWordSession } from '../core/word-session'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'
import { GameShell, ResultOverlay, TypingPrompt } from './GameShell'

interface ChaseGamePageProps {
  audioSettings: AudioSettings
  wordMemory?: WordMemory[]
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

type ChaseStatus = 'playing' | 'paused' | 'won' | 'lost'
const RUN_DURATION_MS = 90_000

export function ChaseGamePage({ audioSettings, wordMemory = [], navigate, toggleAudio, onRunSaved }: ChaseGamePageProps) {
  const [sessionWords, setSessionWords] = useState(() => createWordSession(EXPERIENCE_WORDS, wordMemory, { length: EXPERIENCE_WORDS.length }))
  const [wordIndex, setWordIndex] = useState(0)
  const [distance, setDistance] = useState(100)
  const [remainingMs, setRemainingMs] = useState(RUN_DURATION_MS)
  const [correctWords, setCorrectWords] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [difficulty, setDifficulty] = useState(INITIAL_DIFFICULTY)
  const [status, setStatus] = useState<ChaseStatus>('playing')
  const [stumble, setStumble] = useState(false)
  const [runStarted, setRunStarted] = useState(false)
  const [finalDurationMs, setFinalDurationMs] = useState<number | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const currentWord = sessionWords[wordIndex % sessionWords.length]
  const typing = useTypingSession(currentWord.text, status === 'playing')

  const runClockRef = useRef(new ActiveRunClock())
  const mistakesRef = useRef(0)
  const correctCharactersRef = useRef(0)
  const completedWordsRef = useRef<string[]>([])
  const completedWordIdsRef = useRef<string[]>([])
  const mistakeWordIdsRef = useRef<string[]>([])
  const processedSequenceRef = useRef(0)
  const savedRef = useRef(false)
  const statusRef = useRef<ChaseStatus>('playing')
  const difficultyRef = useRef(INITIAL_DIFFICULTY)

  const setGameStatus = useCallback((nextStatus: ChaseStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  const wordMemoryKey = wordMemory.map((word) => `${word.wordId}:${word.lastPracticedAt}:${word.needsReview}`).join('|')
  useEffect(() => {
    if (wordMemory.length === 0 || runClockRef.current.hasStarted || statusRef.current !== 'playing') return
    const nextSession = createWordSession(EXPERIENCE_WORDS, wordMemory, { length: EXPERIENCE_WORDS.length })
    setSessionWords(nextSession)
    setWordIndex(0)
    typing.reset(nextSession[0].text)
  }, [wordMemoryKey])

  const saveRun = useCallback(async (
    completed: boolean,
    finalWords: number,
    finalMaxStreak: number,
    finalDistance: number,
  ) => {
    if (savedRef.current) return
    savedRef.current = true
    const timing = runClockRef.current.finish()
    setFinalDurationMs(timing.durationMs)
    const run: RunResult = {
      id: createRunId('chase'),
      gameId: 'chase',
      mode: 'copy',
      wordPackId: 'experience-grade-4',
      difficulty: difficultyRef.current.speedTier,
      speedTier: difficultyRef.current.speedTier,
      rulesVersion: '1.2.0',
      startedAt: timing.startedAt,
      completedAt: timing.completedAt,
      durationMs: timing.durationMs,
      pausedMs: timing.pausedMs,
      completed,
      correctWords: finalWords,
      correctCharacters: correctCharactersRef.current,
      mistakes: mistakesRef.current,
      maxStreak: finalMaxStreak,
      score: finalWords * 120 + finalMaxStreak * 30,
      words: [...completedWordsRef.current],
      wordIds: [...completedWordIdsRef.current],
      mistakeWordIds: [...mistakeWordIdsRef.current],
      usedFullHints: true,
      remainingDistance: finalDistance,
    }
    try {
      const location = await progressStore.saveRun(run)
      if (location === 'memory') setStorageWarning(true)
      await onRunSaved()
    } catch {
      savedRef.current = false
      setStorageWarning(true)
    }
  }, [onRunSaved])

  useEffect(() => {
    if (status !== 'playing' || !runStarted) return
    let previousTick = performance.now()
    const timer = window.setInterval(() => {
      const currentTick = performance.now()
      const elapsed = Math.max(0, currentTick - previousTick)
      previousTick = currentTick
      setRemainingMs((value) => Math.max(0, value - elapsed))
    }, 100)
    return () => window.clearInterval(timer)
  }, [runStarted, status])

  useEffect(() => {
    if (remainingMs > 0 || statusRef.current !== 'playing') return
    mistakeWordIdsRef.current.push(currentWord.id)
    setGameStatus('lost')
    audioService.play('run.failure')
    void saveRun(false, correctWords, maxStreak, distance)
  }, [correctWords, currentWord.id, distance, maxStreak, remainingMs, saveRun, setGameStatus])

  const handleComplete = useCallback(async () => {
    if (statusRef.current !== 'playing') return
    const step = Math.max(8, 10 + currentWord.text.length - (difficultyRef.current.speedTier - 1))
    const nextDistance = Math.max(0, distance - step)
    const nextWords = correctWords + 1
    const nextStreak = streak + 1
    const nextMax = Math.max(maxStreak, nextStreak)
    const attempts = correctCharactersRef.current + mistakesRef.current
    const accuracy = attempts === 0 ? 1 : correctCharactersRef.current / attempts
    const nextDifficulty = adaptDifficulty(difficultyRef.current, accuracy, nextWords)

    difficultyRef.current = nextDifficulty
    completedWordsRef.current.push(currentWord.text)
    completedWordIdsRef.current.push(currentWord.id)
    setDifficulty(nextDifficulty)
    setDistance(nextDistance)
    setCorrectWords(nextWords)
    setStreak(nextStreak)
    setMaxStreak(nextMax)
    audioService.play(nextDistance === 0 ? 'chase.catch' : 'chase.step')
    audioService.speak(currentWord.text)

    if (nextDistance === 0) {
      setGameStatus('won')
      await saveRun(true, nextWords, nextMax, nextDistance)
      return
    }
    setWordIndex((value) => (value + 1) % sessionWords.length)
  }, [correctWords, currentWord.id, currentWord.text, distance, maxStreak, saveRun, sessionWords.length, setGameStatus, streak])

  useEffect(() => {
    const event = typing.lastEvent
    if (!event || event.sequence === processedSequenceRef.current) return
    processedSequenceRef.current = event.sequence
    if (!runClockRef.current.hasStarted) {
      runClockRef.current.start()
      setRunStarted(true)
    }
    if (event.type === 'correct' || event.type === 'complete') {
      correctCharactersRef.current += 1
    }
    if (event.type === 'correct') audioService.play('typing.correct')
    if (event.type === 'mistake') {
      mistakesRef.current += 1
      mistakeWordIdsRef.current.push(currentWord.id)
      setStreak(0)
      setStumble(true)
      window.setTimeout(() => setStumble(false), 220)
      audioService.play('typing.wrong')
    }
    if (event.type === 'complete') void handleComplete()
  }, [handleComplete, typing.lastEvent])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && statusRef.current === 'playing') {
        runClockRef.current.pause()
        setGameStatus('paused')
      }
      if (!document.hidden && statusRef.current === 'paused') {
        runClockRef.current.resume()
        setGameStatus('playing')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [setGameStatus])

  const restart = () => {
    const nextSession = createWordSession(EXPERIENCE_WORDS, wordMemory, { length: EXPERIENCE_WORDS.length })
    runClockRef.current.reset()
    mistakesRef.current = 0
    correctCharactersRef.current = 0
    completedWordsRef.current = []
    completedWordIdsRef.current = []
    mistakeWordIdsRef.current = []
    processedSequenceRef.current = 0
    savedRef.current = false
    difficultyRef.current = INITIAL_DIFFICULTY
    statusRef.current = 'playing'
    setStorageWarning(false)
    setSessionWords(nextSession)
    setRunStarted(false)
    setFinalDurationMs(null)
    setDifficulty(INITIAL_DIFFICULTY)
    setWordIndex(0)
    setDistance(100)
    setRemainingMs(RUN_DURATION_MS)
    setCorrectWords(0)
    setStreak(0)
    setMaxStreak(0)
    setGameStatus('playing')
    typing.reset(nextSession[0].text)
  }

  const policePosition = 8 + (100 - distance) * 0.64

  return (
    <GameShell title="城市追踪战" subtitle="抄写模式 · 90 秒" audioSettings={audioSettings} navigate={navigate} toggleAudio={toggleAudio}>
      <main className="chase-game-layout">
        <section className="chase-stage-card">
          <div className="game-hud"><span><Icon name="timer" /><b>{Math.ceil(remainingMs / 1000)}</b> 秒</span><span>连续正确 <b>{streak}</b></span><span>还差 <b>{distance}</b> 米</span><span>速度 <b>{difficulty.speedTier}</b> 级</span></div>
          <div className="chase-progress"><i style={{ width: `${100 - distance}%` }} /></div>
          <div className="city-stage" aria-label={`警察距离目标还有 ${distance} 米`}>
            <div className="city-skyline">{[44,70,54,86,62,74,48,66].map((height, index) => <i style={{ height }} key={index} />)}</div>
            <div className="city-road" />
            <div className={`police-runner ${stumble ? 'stumble' : ''}`} style={{ left: `${policePosition}%` }}><span /><b>巡逻员</b></div>
            <div className="thief-runner"><span /><b>徽章</b></div>
            <div className="chase-message">每完成一个单词，就靠近一步</div>
          </div>
        </section>
        <TypingPrompt word={currentWord} snapshot={typing.snapshot} hintLevel={difficulty.hintLevel} onSpeak={() => audioService.speak(currentWord.text)} />
      </main>
      {storageWarning && <p className="storage-warning" role="status">本局暂存在当前页面，请保持页面开启后再继续练习。</p>}
      {status === 'paused' && <ResultOverlay state="paused" title="追踪已暂停" detail="计时器也暂停了，准备好后继续。" onPrimary={() => { runClockRef.current.resume(); setGameStatus('playing') }} primaryLabel="继续追踪" onExit={() => navigate('home')} />}
      {status === 'won' && <ResultOverlay state="won" title="城市徽章找回来了！" detail={`完成 ${correctWords} 个单词，活跃用时 ${Math.round((finalDurationMs ?? 0) / 1000)} 秒。`} onPrimary={restart} primaryLabel="再次挑战" onExit={() => navigate('home')} />}
      {status === 'lost' && <ResultOverlay state="lost" title="线索还在" detail={`已经完成 ${correctWords} 个单词，下次从更准确的输入开始。`} onPrimary={restart} primaryLabel="重新追踪" onExit={() => navigate('home')} />}
    </GameShell>
  )
}
