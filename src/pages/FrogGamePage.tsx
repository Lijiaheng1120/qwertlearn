import { useCallback, useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { AudioSettings } from '../core/audio-service'
import { audioService } from '../core/audio-service'
import {
  endlessDifficultyForStage,
  FROG_MAX_FAILURES,
  FROG_RULES_VERSION,
  getFrogRoundDurationMs as calculateFrogRoundDurationMs,
  getFrogStageRules,
  stageForCompletedWords,
  WORDS_PER_STAGE,
  wordsIntoStage,
} from '../core/challenge-progression'
import {
  adaptDifficulty,
  createRunId,
  EXPERIENCE_WORDS,
  INITIAL_DIFFICULTY,
  WORD_SESSION_BATCH_SIZE,
  type ChallengeMode,
  type RewardSlot,
  type RunResult,
  type RunRewardBreakdown,
  type WordMemory,
} from '../core/models'
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
  highestUnlockedStage?: number
  equippedRewards?: Partial<Record<RewardSlot, string>>
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

type FrogStatus = 'playing' | 'animating' | 'paused' | 'ended' | 'lost'

export function getFrogRoundDurationMs(word: string, speedTier: number, stageLevel = 1): number {
  return calculateFrogRoundDurationMs(word, speedTier, stageLevel)
}

export function FrogGamePage({
  audioSettings,
  wordMemory = [],
  highestUnlockedStage = 0,
  equippedRewards = {},
  navigate,
  toggleAudio,
  onRunSaved,
}: FrogGamePageProps) {
  const wordMemoryKey = wordMemory.map((word) => `${word.wordId}:${word.lastPracticedAt}:${word.needsReview}`).join('|')
  const createQueue = useCallback((avoidWordId?: string) => {
    const queue = createWordSession(EXPERIENCE_WORDS, wordMemory, { length: WORD_SESSION_BATCH_SIZE })
    if (avoidWordId && queue[0]?.id === avoidWordId) {
      const replacementIndex = queue.findIndex((word) => word.id !== avoidWordId)
      if (replacementIndex > 0) [queue[0], queue[replacementIndex]] = [queue[replacementIndex], queue[0]]
    }
    return queue
  }, [wordMemoryKey])

  const [sessionWords, setSessionWords] = useState(() => createWordSession(EXPERIENCE_WORDS, wordMemory, { length: WORD_SESSION_BATCH_SIZE }))
  const [wordIndex, setWordIndex] = useState(0)
  const [failures, setFailures] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [correctWords, setCorrectWords] = useState(0)
  const [difficulty, setDifficulty] = useState(INITIAL_DIFFICULTY)
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('learning')
  const [startStage, setStartStage] = useState(1)
  const [stageLevel, setStageLevel] = useState(1)
  const [endlessUnlocked, setEndlessUnlocked] = useState(highestUnlockedStage >= 2)
  const [remainingMs, setRemainingMs] = useState(() => getFrogRoundDurationMs(sessionWords[0].text, INITIAL_DIFFICULTY.speedTier, 1))
  const [status, setStatus] = useState<FrogStatus>('playing')
  const [runStarted, setRunStarted] = useState(false)
  const [storageWarning, setStorageWarning] = useState(false)
  const [stageNotice, setStageNotice] = useState<string | null>(null)
  const [finalDurationMs, setFinalDurationMs] = useState<number | null>(null)
  const [finalBreakdown, setFinalBreakdown] = useState<RunRewardBreakdown | null>(null)
  const currentWord = sessionWords[wordIndex % sessionWords.length]
  const typing = useTypingSession(currentWord.text, status === 'playing')

  const canvasRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<FrogScene | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const runClockRef = useRef(new ActiveRunClock())
  const mountedRef = useRef(true)
  const mistakesRef = useRef(0)
  const failuresRef = useRef(0)
  const correctCharactersRef = useRef(0)
  const completedWordsRef = useRef<string[]>([])
  const completedWordIdsRef = useRef<string[]>([])
  const mistakeWordIdsRef = useRef<string[]>([])
  const maxStreakRef = useRef(0)
  const processedSequenceRef = useRef(0)
  const savedRef = useRef(false)
  const statusRef = useRef<FrogStatus>('playing')
  const difficultyRef = useRef(INITIAL_DIFFICULTY)
  const challengeModeRef = useRef<ChallengeMode>('learning')
  const startStageRef = useRef(1)
  const stageLevelRef = useRef(1)
  const highestStageRef = useRef(1)
  const stageNoticeTimerRef = useRef<number | null>(null)

  const setGameStatus = useCallback((nextStatus: FrogStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  useEffect(() => {
    if (highestUnlockedStage >= 2) setEndlessUnlocked(true)
  }, [highestUnlockedStage])

  useEffect(() => {
    if (wordMemory.length === 0 || runClockRef.current.hasStarted || statusRef.current !== 'playing') return
    const nextSession = createQueue()
    const firstWord = nextSession[0]
    setSessionWords(nextSession)
    setWordIndex(0)
    setRemainingMs(getFrogRoundDurationMs(firstWord.text, difficultyRef.current.speedTier, stageLevelRef.current))
    typing.reset(firstWord.text)
    sceneRef.current?.setTarget(firstWord.text)
  }, [createQueue, wordMemoryKey])

  useEffect(() => {
    if (!canvasRef.current || gameRef.current) return
    mountedRef.current = true
    const scene = new FrogScene()
    sceneRef.current = scene
    scene.setTarget(currentWord.text)
    scene.configureStage(getFrogStageRules(stageLevelRef.current))
    scene.applyRewards({
      frogSkin: equippedRewards.frogSkin,
      lilyTheme: equippedRewards.lilyTheme,
    })
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
      if (stageNoticeTimerRef.current !== null) window.clearTimeout(stageNoticeTimerRef.current)
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

  useEffect(() => {
    sceneRef.current?.configureStage(getFrogStageRules(stageLevel))
  }, [stageLevel])

  useEffect(() => {
    sceneRef.current?.applyRewards({
      frogSkin: equippedRewards.frogSkin,
      lilyTheme: equippedRewards.lilyTheme,
    })
  }, [equippedRewards.frogSkin, equippedRewards.lilyTheme])

  const saveRun = useCallback(async (
    completed: boolean,
    finalWords: number,
    finalMaxStreak: number,
    finalHighestStage: number,
  ) => {
    if (savedRef.current) return
    savedRef.current = true
    const timing = runClockRef.current.finish()
    const run: RunResult = {
      id: createRunId('frog'),
      gameId: 'frog',
      mode: 'copy',
      wordPackId: 'fltrp-grade4-v1',
      difficulty: difficultyRef.current.speedTier,
      speedTier: difficultyRef.current.speedTier,
      rulesVersion: FROG_RULES_VERSION,
      challengeMode: challengeModeRef.current,
      startStage: startStageRef.current,
      highestStage: Math.max(startStageRef.current, finalHighestStage),
      badgesRecovered: 0,
      startedAt: timing.startedAt,
      completedAt: timing.completedAt,
      durationMs: timing.durationMs,
      pausedMs: timing.pausedMs,
      completed,
      correctWords: finalWords,
      correctCharacters: correctCharactersRef.current,
      mistakes: mistakesRef.current,
      failures: failuresRef.current,
      maxStreak: finalMaxStreak,
      score: finalWords * 100 + finalMaxStreak * 25 + Math.max(0, finalHighestStage - startStageRef.current) * 300,
      words: [...completedWordsRef.current],
      wordIds: [...completedWordIdsRef.current],
      mistakeWordIds: [...mistakeWordIdsRef.current],
      usedFullHints: true,
    }
    setFinalDurationMs(timing.durationMs)
    setFinalBreakdown(progressStore.previewRunReward(run))
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
    void saveRun(false, completedWordsRef.current.length, maxStreakRef.current, highestStageRef.current)
  }, [saveRun])

  const handleTimeout = useCallback(() => {
    if (statusRef.current !== 'playing') return
    const nextFailures = failuresRef.current + 1
    failuresRef.current = nextFailures
    setFailures(nextFailures)
    mistakeWordIdsRef.current.push(currentWord.id)
    setGameStatus('animating')
    audioService.play('frog.rescue')
    sceneRef.current?.showRescue(currentWord.text)
    setStreak(0)

    if (nextFailures >= FROG_MAX_FAILURES) {
      sceneRef.current?.cancelPendingActions()
      setGameStatus('lost')
      audioService.play('run.failure')
      void saveRun(false, correctWords, maxStreak, highestStageRef.current)
      return
    }

    let nextSession = sessionWords
    let nextWordIndex = wordIndex + 1
    if (nextWordIndex >= nextSession.length) {
      nextSession = createQueue(currentWord.id)
      nextWordIndex = 0
      setSessionWords(nextSession)
    }
    const nextWord = nextSession[nextWordIndex]
    window.setTimeout(() => {
      if (!mountedRef.current) return
      setRemainingMs(getFrogRoundDurationMs(nextWord.text, difficultyRef.current.speedTier, stageLevelRef.current))
      setWordIndex(nextWordIndex)
      setGameStatus('playing')
    }, 320)
  }, [correctWords, createQueue, currentWord.id, currentWord.text, maxStreak, saveRun, sessionWords, setGameStatus, wordIndex])


  useEffect(() => {
    setRemainingMs(getFrogRoundDurationMs(currentWord.text, difficulty.speedTier, stageLevel))
  }, [currentWord.id, currentWord.text, difficulty.speedTier, stageLevel])

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

  const announceStage = useCallback((nextStage: number) => {
    setStageNotice(`阶段 ${nextStage}，荷叶变为 ${getFrogStageRules(nextStage).lilyRows} 排，继续跳！`)
    if (stageNoticeTimerRef.current !== null) window.clearTimeout(stageNoticeTimerRef.current)
    stageNoticeTimerRef.current = window.setTimeout(() => setStageNotice(null), 1_600)
    sceneRef.current?.showStageBanner(nextStage)
    audioService.play('level.up')
  }, [])

  const handleWordComplete = useCallback(async () => {
    if (statusRef.current !== 'playing') return
    setGameStatus('animating')
    const nextCorrectWords = correctWords + 1
    const nextStreak = streak + 1
    const nextMaxStreak = Math.max(maxStreak, nextStreak)
    const nextStage = stageForCompletedWords(nextCorrectWords, startStageRef.current)
    const attempts = correctCharactersRef.current + mistakesRef.current
    const accuracy = attempts === 0 ? 1 : correctCharactersRef.current / attempts
    const adaptedDifficulty = adaptDifficulty(difficultyRef.current, accuracy, nextCorrectWords)
    const nextDifficulty = challengeModeRef.current === 'endless'
      ? endlessDifficultyForStage({
          ...adaptedDifficulty,
          speedTier: Math.max(difficultyRef.current.speedTier, adaptedDifficulty.speedTier) as typeof adaptedDifficulty.speedTier,
          hintLevel: Math.min(difficultyRef.current.hintLevel, adaptedDifficulty.hintLevel) as typeof adaptedDifficulty.hintLevel,
        }, nextStage)
      : adaptedDifficulty

    let nextSession = sessionWords
    let nextIndex = wordIndex + 1
    let refilled = false
    if (nextIndex >= nextSession.length) {
      nextSession = createQueue(currentWord.id)
      nextIndex = 0
      refilled = true
    }
    const nextWord = nextSession[nextIndex]

    difficultyRef.current = nextDifficulty
    completedWordsRef.current.push(currentWord.text)
    completedWordIdsRef.current.push(currentWord.id)
    maxStreakRef.current = nextMaxStreak
    stageLevelRef.current = nextStage
    highestStageRef.current = Math.max(highestStageRef.current, nextStage)
    setDifficulty(nextDifficulty)
    setCorrectWords(nextCorrectWords)
    setStreak(nextStreak)
    setMaxStreak(nextMaxStreak)
    setStageLevel(nextStage)
    audioService.play('frog.jump')
    if ([5, 10, 20].includes(nextStreak)) audioService.play('combo.up')
    audioService.speak(currentWord.text)

    if (nextStage > stageLevel) {
      announceStage(nextStage)
      if (nextStage >= 2) setEndlessUnlocked(true)
    }

    await sceneRef.current?.jumpToNext(nextWord.text)
    if (!mountedRef.current) return
    if (refilled) setSessionWords(nextSession)
    setWordIndex(nextIndex)
    setGameStatus('playing')
  }, [announceStage, correctWords, createQueue, currentWord.id, currentWord.text, maxStreak, sessionWords, setGameStatus, stageLevel, streak, wordIndex])

  useEffect(() => {
    const event = typing.lastEvent
    if (!event || event.sequence === processedSequenceRef.current) return
    processedSequenceRef.current = event.sequence
    runClockRef.current.start()
    setRunStarted(true)

    if (event.type === 'correct' || event.type === 'complete') correctCharactersRef.current += 1
    if (event.type === 'correct') audioService.play('typing.correct')
    if (event.type === 'mistake') {
      mistakesRef.current += 1
      mistakeWordIdsRef.current.push(currentWord.id)
      setStreak(0)
      audioService.play('typing.wrong')
      sceneRef.current?.showMistake()
    }
    if (event.type === 'complete') void handleWordComplete()
  }, [currentWord.id, handleWordComplete, typing.lastEvent])

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

  const reset = (nextMode: ChallengeMode = challengeModeRef.current) => {
    const nextStartStage = nextMode === 'endless' ? Math.max(2, highestUnlockedStage, highestStageRef.current) : 1
    const nextSession = createQueue()
    const firstWord = nextSession[0]
    const nextDifficulty = nextMode === 'endless'
      ? endlessDifficultyForStage(INITIAL_DIFFICULTY, nextStartStage)
      : INITIAL_DIFFICULTY
    runClockRef.current.reset()
    mistakesRef.current = 0
    failuresRef.current = 0
    correctCharactersRef.current = 0
    completedWordsRef.current = []
    completedWordIdsRef.current = []
    mistakeWordIdsRef.current = []
    maxStreakRef.current = 0
    processedSequenceRef.current = 0
    savedRef.current = false
    difficultyRef.current = nextDifficulty
    challengeModeRef.current = nextMode
    startStageRef.current = nextStartStage
    stageLevelRef.current = nextStartStage
    highestStageRef.current = nextStartStage
    statusRef.current = 'playing'
    setStorageWarning(false)
    setFinalDurationMs(null)
    setFinalBreakdown(null)
    setRunStarted(false)
    setSessionWords(nextSession)
    setChallengeMode(nextMode)
    setStartStage(nextStartStage)
    setStageLevel(nextStartStage)
    setDifficulty(nextDifficulty)
    setWordIndex(0)
    setRemainingMs(getFrogRoundDurationMs(firstWord.text, nextDifficulty.speedTier, nextStartStage))
    setFailures(0)
    setStreak(0)
    setMaxStreak(0)
    setCorrectWords(0)
    setGameStatus('playing')
    typing.reset(firstWord.text)
    sceneRef.current?.configureStage(getFrogStageRules(nextStartStage))
    sceneRef.current?.resetRun(firstWord.text)
  }

  const finishRun = async () => {
    if (!runClockRef.current.hasStarted || !['playing', 'animating'].includes(statusRef.current)) return
    setGameStatus('ended')
    audioService.play('run.success')
    await saveRun(true, correctWords, maxStreak, highestStageRef.current)
  }

  const roundDuration = getFrogRoundDurationMs(currentWord.text, difficulty.speedTier, stageLevel)
  const rewardDetail = finalBreakdown
    ? `获得 ${finalBreakdown.total} 冒险积分：基础 ${finalBreakdown.basePoints} + 阶段 ${finalBreakdown.stageBonus} + 准确 ${finalBreakdown.accuracyBonus}。`
    : ''

  return (
    <GameShell
      title="青蛙跳荷叶"
      subtitle={`${challengeMode === 'endless' ? '无尽挑战' : '普通学习'} · 阶段 ${stageLevel}`}
      audioSettings={audioSettings}
      navigate={navigate}
      toggleAudio={toggleAudio}
    >
      <main className={`frog-game-layout ${equippedRewards.lilyTheme === 'lily-emerald' ? 'lily-emerald-equipped' : ''}`}>
        <section className="frog-stage-card">
          <div className="challenge-track-switch" role="group" aria-label="青蛙挑战路线">
            <button aria-pressed={challengeMode === 'learning'} disabled={runStarted && challengeMode !== 'learning'} onClick={() => reset('learning')}>
              <strong>普通学习</strong><small>自适应提示 · 从阶段 1 开始</small>
            </button>
            <button aria-pressed={challengeMode === 'endless'} disabled={!endlessUnlocked || (runStarted && challengeMode !== 'endless')} onClick={() => reset('endless')}>
              <strong>无尽挑战</strong><small>{endlessUnlocked ? `从已解锁阶段 ${Math.max(2, highestUnlockedStage, highestStageRef.current)} 开始` : '通过阶段 1 后解锁'}</small>
            </button>
            <button className="end-run-button" disabled={!runStarted || status !== 'playing'} onClick={() => void finishRun()}>结束本局并结算</button>
          </div>
          <div className="game-hud">
            <span aria-label={`失败 ${failures} 次，最多 ${FROG_MAX_FAILURES} 次`}><Icon name="heart" /><b>失败 {failures}/{FROG_MAX_FAILURES}</b></span>
            <span>阶段 <b>{stageLevel}</b></span>
            <span>本阶段 <b>{wordsIntoStage(correctWords)}/{WORDS_PER_STAGE}</b></span>
            <span>连续 <b>{streak}</b></span>
            <span>速度 <b>{difficulty.speedTier}</b> 级</span>
          </div>
          <div className="stage-progress" aria-label={`阶段 ${stageLevel} 已完成 ${wordsIntoStage(correctWords)} 个单词`}><i style={{ width: `${wordsIntoStage(correctWords) / WORDS_PER_STAGE * 100}%` }} /></div>
          <div className="phaser-frame" ref={canvasRef} aria-label={`青蛙在 ${getFrogStageRules(stageLevel).lilyRows} 排移动荷叶间跳跃`} />
          {stageNotice && <div className="stage-up-banner" role="status">{stageNotice}</div>}
          <p className="round-timer-label">
            {typing.snapshot.status === 'idle'
              ? `按第一个字母后开始，本词有 ${Math.ceil(roundDuration / 1000)} 秒`
              : `慢慢输入，本词还剩 ${Math.ceil(remainingMs / 1000)} 秒`}
          </p>
          <div className="round-timer" aria-label={typing.snapshot.status === 'idle' ? '按下第一个字母后开始计时' : '当前单词剩余时间'}><i style={{ width: `${Math.max(0, remainingMs / roundDuration * 100)}%` }} /></div>
        </section>
        <TypingPrompt word={currentWord} snapshot={typing.snapshot} hintLevel={difficulty.hintLevel} onSpeak={() => audioService.speak(currentWord.text)} />
      </main>
      {storageWarning && <p className="storage-warning" role="status">本局暂存在当前页面，请保持页面开启后再继续练习。</p>}
      {status === 'paused' && <ResultOverlay state="paused" title="游戏已暂停" detail="页面重新显示后，可以从当前单词继续。" onPrimary={() => { runClockRef.current.resume(); setGameStatus('playing') }} primaryLabel="继续游戏" onExit={() => navigate('home')} />}
      {status === 'ended' && <ResultOverlay state="won" title="本次池塘冒险已结算" detail={`完成 ${correctWords} 个单词，到达阶段 ${stageLevel}，活跃 ${Math.round((finalDurationMs ?? 0) / 1000)} 秒。${rewardDetail}`} onPrimary={() => reset(challengeModeRef.current)} primaryLabel="继续挑战" onExit={() => navigate('home')} />}
      {status === 'lost' && <ResultOverlay state="lost" title="青蛙坐船回岸边了" detail={`累计失败 ${failures}/${FROG_MAX_FAILURES} 次，本局结束；已经完成 ${correctWords} 个单词，到达阶段 ${stageLevel}。${rewardDetail}`} onPrimary={() => reset(challengeModeRef.current)} primaryLabel="重新挑战" onExit={() => navigate('home')} />}
    </GameShell>
  )
}
