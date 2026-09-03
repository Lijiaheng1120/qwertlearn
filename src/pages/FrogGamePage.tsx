import { useCallback, useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { AudioSettings } from '../core/audio-service'
import { audioService } from '../core/audio-service'
import { adaptDifficulty, createRunId, EXPERIENCE_WORDS, INITIAL_DIFFICULTY, type RunResult, type WordMemory } from '../core/models'
import { progressStore } from '../core/progress-store'
import { ActiveRunClock } from '../core/run-clock'
import { useTypingSession } from '../core/use-typing-session'
import { createWordSession } from '../core/word-session'
import { FrogScene } from '../games/frog/FrogScene'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'
import { GameShell, ResultOverlay, TypingPrompt } from './GameShell'

interface FrogGamePageProps {
  audioSettings: AudioSettings
  wordMemory?: WordMemory[]
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

type FrogStatus = 'playing' | 'animating' | 'paused' | 'won' | 'lost'
const TARGET_WORDS = 8

export function getFrogRoundDurationMs(word: string, speedTier: number): number {
  const tierIndex = Math.max(0, Math.min(4, speedTier - 1))
  const tierMultiplier = [1.6, 1.3, 1.05, 0.9, 0.78][tierIndex]
  const minimum = [18_000, 14_000, 11_000, 8_000, 7_000][tierIndex]
  const maximum = [30_000, 25_000, 21_000, 18_000, 15_000][tierIndex]
  return Math.round(Math.max(minimum, Math.min(maximum, (4_000 + word.length * 2_200) * tierMultiplier)))
}

export function FrogGamePage({ audioSettings, wordMemory = [], navigate, toggleAudio, onRunSaved }: FrogGamePageProps) {
  const [sessionWords, setSessionWords] = useState(() => createWordSession(EXPERIENCE_WORDS, wordMemory, { length: TARGET_WORDS }))
  const [wordIndex, setWordIndex] = useState(0)
  const [lives, setLives] = useState(3)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [correctWords, setCorrectWords] = useState(0)
  const [difficulty, setDifficulty] = useState(INITIAL_DIFFICULTY)
  const [remainingMs, setRemainingMs] = useState(() => getFrogRoundDurationMs(sessionWords[0].text, INITIAL_DIFFICULTY.speedTier))
  const [status, setStatus] = useState<FrogStatus>('playing')
  const [storageWarning, setStorageWarning] = useState(false)
  const currentWord = sessionWords[wordIndex % sessionWords.length]
  const typing = useTypingSession(currentWord.text, status === 'playing')

  const canvasRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<FrogScene | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const runClockRef = useRef(new ActiveRunClock())
  const mountedRef = useRef(true)
  const mistakesRef = useRef(0)
  const correctCharactersRef = useRef(0)
  const completedWordsRef = useRef<string[]>([])
  const completedWordIdsRef = useRef<string[]>([])
  const mistakeWordIdsRef = useRef<string[]>([])
  const maxStreakRef = useRef(0)
  const processedSequenceRef = useRef(0)
  const savedRef = useRef(false)
  const statusRef = useRef<FrogStatus>('playing')
  const difficultyRef = useRef(INITIAL_DIFFICULTY)

  const setGameStatus = useCallback((nextStatus: FrogStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  const wordMemoryKey = wordMemory.map((word) => `${word.wordId}:${word.lastPracticedAt}:${word.needsReview}`).join('|')
  useEffect(() => {
    if (wordMemory.length === 0 || runClockRef.current.hasStarted || statusRef.current !== 'playing') return
    const nextSession = createWordSession(EXPERIENCE_WORDS, wordMemory, { length: TARGET_WORDS })
    const firstWord = nextSession[0]
    setSessionWords(nextSession)
    setWordIndex(0)
    setRemainingMs(getFrogRoundDurationMs(firstWord.text, INITIAL_DIFFICULTY.speedTier))
    typing.reset(firstWord.text)
    sceneRef.current?.setTarget(firstWord.text)
  }, [wordMemoryKey])

  useEffect(() => {
    if (!canvasRef.current || gameRef.current) return
    mountedRef.current = true
    const scene = new FrogScene()
    sceneRef.current = scene
    scene.setTarget(currentWord.text)
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: canvasRef.current,
      width: 960,
      height: 540,
      transparent: true,
      render: { antialias: true, roundPixels: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [scene],
    })
    gameRef.current = game

    return () => {
      mountedRef.current = false
      scene.cancelPendingActions()
      if (gameRef.current === game) gameRef.current = null
      if (sceneRef.current === scene) sceneRef.current = null
      queueMicrotask(() => {
        try {
          game.destroy(true)
        } catch {
          game.canvas?.remove()
        }
      })
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setTarget(currentWord.text)
  }, [currentWord.text])

  const saveRun = useCallback(async (completed: boolean, finalWords: number, finalMaxStreak: number) => {
    if (savedRef.current) return
    savedRef.current = true
    const timing = runClockRef.current.finish()
    const run: RunResult = {
      id: createRunId('frog'),
      gameId: 'frog',
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
      score: finalWords * 100 + finalMaxStreak * 25,
      words: [...completedWordsRef.current],
      wordIds: [...completedWordIdsRef.current],
      mistakeWordIds: [...mistakeWordIdsRef.current],
      usedFullHints: true,
    }
    try {
      const location = await progressStore.saveRun(run)
      if (location === 'memory' && mountedRef.current) setStorageWarning(true)
      await onRunSaved()
    } catch {
      savedRef.current = false
      if (mountedRef.current) setStorageWarning(true)
    }
  }, [onRunSaved])

  useEffect(() => () => {
    if (!runClockRef.current.hasStarted || savedRef.current) return
    void saveRun(false, completedWordsRef.current.length, maxStreakRef.current)
  }, [saveRun])

  const handleTimeout = useCallback(() => {
    if (statusRef.current !== 'playing') return
    mistakeWordIdsRef.current.push(currentWord.id)
    setGameStatus('animating')
    audioService.play('frog.rescue')
    sceneRef.current?.showRescue(currentWord.text)
    setStreak(0)

    if (lives <= 1) {
      setLives(0)
      setGameStatus('lost')
      audioService.play('run.failure')
      void saveRun(false, correctWords, maxStreak)
      return
    }

    const nextWordIndex = (wordIndex + 1) % sessionWords.length
    setLives((value) => value - 1)
    window.setTimeout(() => {
      const nextWord = sessionWords[nextWordIndex]
      setRemainingMs(getFrogRoundDurationMs(nextWord.text, difficultyRef.current.speedTier))
      setWordIndex(nextWordIndex)
      setGameStatus('playing')
    }, 320)
  }, [correctWords, currentWord.id, currentWord.text, lives, maxStreak, saveRun, sessionWords, setGameStatus, wordIndex])

  useEffect(() => {
    setRemainingMs(getFrogRoundDurationMs(currentWord.text, difficulty.speedTier))
  }, [currentWord.id, currentWord.text, difficulty.speedTier])

  useEffect(() => {
    if (status !== 'playing' || typing.snapshot.status === 'idle') return
    let previousTick = performance.now()
    const timer = window.setInterval(() => {
      const currentTick = performance.now()
      const elapsed = Math.max(0, currentTick - previousTick)
      previousTick = currentTick
      setRemainingMs((value) => {
        const next = Math.max(0, value - elapsed)
        if (next === 0) window.clearInterval(timer)
        return next
      })
    }, 100)
    return () => window.clearInterval(timer)
  }, [currentWord.id, status, typing.snapshot.status])

  useEffect(() => {
    if (remainingMs === 0 && status === 'playing') handleTimeout()
  }, [handleTimeout, remainingMs, status])

  const handleWordComplete = useCallback(async () => {
    if (statusRef.current !== 'playing') return
    setGameStatus('animating')
    const nextCorrectWords = correctWords + 1
    const nextStreak = streak + 1
    const nextMaxStreak = Math.max(maxStreak, nextStreak)
    const nextIndex = (wordIndex + 1) % sessionWords.length
    const nextWord = sessionWords[nextIndex]
    const attempts = correctCharactersRef.current + mistakesRef.current
    const accuracy = attempts === 0 ? 1 : correctCharactersRef.current / attempts
    const nextDifficulty = adaptDifficulty(difficultyRef.current, accuracy, nextCorrectWords)

    difficultyRef.current = nextDifficulty
    completedWordsRef.current.push(currentWord.text)
    completedWordIdsRef.current.push(currentWord.id)
    maxStreakRef.current = nextMaxStreak
    setDifficulty(nextDifficulty)
    setCorrectWords(nextCorrectWords)
    setStreak(nextStreak)
    setMaxStreak(nextMaxStreak)
    audioService.play('frog.jump')
    audioService.speak(currentWord.text)
    await sceneRef.current?.jumpToNext(nextWord.text)
    if (!mountedRef.current) return

    if (nextCorrectWords >= TARGET_WORDS) {
      setGameStatus('won')
      audioService.play('run.success')
      await saveRun(true, nextCorrectWords, nextMaxStreak)
      return
    }

    setWordIndex(nextIndex)
    setGameStatus('playing')
  }, [correctWords, currentWord.id, currentWord.text, maxStreak, saveRun, sessionWords, setGameStatus, streak, wordIndex])

  useEffect(() => {
    const event = typing.lastEvent
    if (!event || event.sequence === processedSequenceRef.current) return
    processedSequenceRef.current = event.sequence
    runClockRef.current.start()

    if (event.type === 'correct' || event.type === 'complete') {
      correctCharactersRef.current += 1
    }
    if (event.type === 'correct') audioService.play('typing.correct')
    if (event.type === 'mistake') {
      mistakesRef.current += 1
      mistakeWordIdsRef.current.push(currentWord.id)
      audioService.play('typing.wrong')
      sceneRef.current?.showMistake()
    }
    if (event.type === 'complete') void handleWordComplete()
  }, [handleWordComplete, typing.lastEvent])

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
    const nextSession = createWordSession(EXPERIENCE_WORDS, wordMemory, { length: TARGET_WORDS })
    const firstWord = nextSession[0]
    runClockRef.current.reset()
    mistakesRef.current = 0
    correctCharactersRef.current = 0
    completedWordsRef.current = []
    completedWordIdsRef.current = []
    mistakeWordIdsRef.current = []
    maxStreakRef.current = 0
    processedSequenceRef.current = 0
    savedRef.current = false
    difficultyRef.current = INITIAL_DIFFICULTY
    statusRef.current = 'playing'
    setStorageWarning(false)
    setSessionWords(nextSession)
    setDifficulty(INITIAL_DIFFICULTY)
    setWordIndex(0)
    setRemainingMs(getFrogRoundDurationMs(firstWord.text, INITIAL_DIFFICULTY.speedTier))
    setLives(3)
    setStreak(0)
    setMaxStreak(0)
    setCorrectWords(0)
    setGameStatus('playing')
    typing.reset(firstWord.text)
    sceneRef.current?.resetRun(firstWord.text)
  }

  return (
    <GameShell title="青蛙跳荷叶" subtitle="抄写模式 · 体验词库" audioSettings={audioSettings} navigate={navigate} toggleAudio={toggleAudio}>
      <main className="frog-game-layout">
        <section className="frog-stage-card">
          <div className="game-hud">
            <span aria-label={`剩余 ${lives} 次机会`}><Icon name="heart" />{Array.from({ length: 3 }, (_, index) => <i className={index < lives ? 'alive' : ''} key={index} />)}</span>
            <span>连续跳跃 <b>{streak}</b></span>
            <span>进度 <b>{correctWords}/{TARGET_WORDS}</b></span>
            <span>速度 <b>{difficulty.speedTier}</b> 级</span>
          </div>
          <div className="phaser-frame" ref={canvasRef} aria-label="青蛙在移动荷叶间跳跃的游戏画面" />
          <p className="round-timer-label">
            {typing.snapshot.status === 'idle'
              ? `按第一个字母后开始，本词有 ${Math.ceil(getFrogRoundDurationMs(currentWord.text, difficulty.speedTier) / 1000)} 秒`
              : `慢慢输入，本词还剩 ${Math.ceil(remainingMs / 1000)} 秒`}
          </p>
          <div className="round-timer" aria-label={typing.snapshot.status === 'idle' ? '按下第一个字母后开始计时' : '当前单词剩余时间'}><i style={{ width: `${Math.max(0, remainingMs / getFrogRoundDurationMs(currentWord.text, difficulty.speedTier) * 100)}%` }} /></div>
        </section>
        <TypingPrompt word={currentWord} snapshot={typing.snapshot} hintLevel={difficulty.hintLevel} onSpeak={() => audioService.speak(currentWord.text)} />
      </main>
      {storageWarning && <p className="storage-warning" role="status">本局暂存在当前页面，请保持页面开启后再继续练习。</p>}
      {status === 'paused' && <ResultOverlay state="paused" title="游戏已暂停" detail="页面重新显示后，可以从当前单词继续。" onPrimary={() => { runClockRef.current.resume(); setGameStatus('playing') }} primaryLabel="继续游戏" onExit={() => navigate('home')} />}
      {status === 'won' && <ResultOverlay state="won" title="池塘冒险完成！" detail={`连续跳过 ${maxStreak} 片荷叶，完成了 ${correctWords} 个单词。`} onPrimary={restart} primaryLabel="再玩一次" onExit={() => navigate('home')} />}
      {status === 'lost' && <ResultOverlay state="lost" title="青蛙坐船回岸边了" detail={`已经完成 ${correctWords} 个单词，复习后再挑战就会更稳。`} onPrimary={restart} primaryLabel="重新挑战" onExit={() => navigate('home')} />}
    </GameShell>
  )
}
