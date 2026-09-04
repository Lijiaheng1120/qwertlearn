import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { AudioSettings } from '../core/audio-service'
import { audioService } from '../core/audio-service'
import {
  CHASE_MAX_DISTANCE,
  CHASE_RULES_VERSION,
  CHASE_RUN_DURATION_MS,
  CHASE_START_DISTANCE,
  chaseWordGain,
  endlessDifficultyForStage,
  getChaseStageRules,
} from '../core/challenge-progression'
import {
  adaptDifficulty,
  createRunId,
  EXPERIENCE_WORDS,
  INITIAL_DIFFICULTY,
  type RewardSlot,
  type RunResult,
  type RunRewardBreakdown,
  type WordMemory,
} from '../core/models'
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
  equippedRewards?: Partial<Record<RewardSlot, string>>
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

type ChaseStatus = 'playing' | 'paused' | 'ended' | 'lost'

export function ChaseGamePage({
  audioSettings,
  wordMemory = [],
  equippedRewards = {},
  navigate,
  toggleAudio,
  onRunSaved,
}: ChaseGamePageProps) {
  const wordMemoryKey = wordMemory.map((word) => `${word.wordId}:${word.lastPracticedAt}:${word.needsReview}`).join('|')
  const createQueue = useCallback((avoidWordId?: string) => {
    const queue = createWordSession(EXPERIENCE_WORDS, wordMemory, { length: EXPERIENCE_WORDS.length })
    if (avoidWordId && queue[0]?.id === avoidWordId) {
      const replacementIndex = queue.findIndex((word) => word.id !== avoidWordId)
      if (replacementIndex > 0) [queue[0], queue[replacementIndex]] = [queue[replacementIndex], queue[0]]
    }
    return queue
  }, [wordMemoryKey])

  const [sessionWords, setSessionWords] = useState(() => createWordSession(EXPERIENCE_WORDS, wordMemory, { length: EXPERIENCE_WORDS.length }))
  const [wordIndex, setWordIndex] = useState(0)
  const [distance, setDistance] = useState(CHASE_START_DISTANCE)
  const [remainingMs, setRemainingMs] = useState(CHASE_RUN_DURATION_MS)
  const [correctWords, setCorrectWords] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [difficulty, setDifficulty] = useState(INITIAL_DIFFICULTY)
  const [stageLevel, setStageLevel] = useState(1)
  const [badgesRecovered, setBadgesRecovered] = useState(0)
  const [worldOffset, setWorldOffset] = useState(0)
  const [status, setStatus] = useState<ChaseStatus>('playing')
  const [stumble, setStumble] = useState(false)
  const [runStarted, setRunStarted] = useState(false)
  const [finalDurationMs, setFinalDurationMs] = useState<number | null>(null)
  const [finalBreakdown, setFinalBreakdown] = useState<RunRewardBreakdown | null>(null)
  const [stageNotice, setStageNotice] = useState<string | null>(null)
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
  const mountedRef = useRef(true)
  const statusRef = useRef<ChaseStatus>('playing')
  const difficultyRef = useRef(INITIAL_DIFFICULTY)
  const distanceRef = useRef(CHASE_START_DISTANCE)
  const stageLevelRef = useRef(1)
  const badgesRecoveredRef = useRef(0)
  const worldOffsetRef = useRef(0)
  const maxStreakRef = useRef(0)
  const stageNoticeTimerRef = useRef<number | null>(null)

  const setGameStatus = useCallback((nextStatus: ChaseStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  useEffect(() => () => {
    mountedRef.current = false
    if (stageNoticeTimerRef.current !== null) window.clearTimeout(stageNoticeTimerRef.current)
  }, [])

  useEffect(() => {
    if (wordMemory.length === 0 || runClockRef.current.hasStarted || statusRef.current !== 'playing') return
    const nextSession = createQueue()
    setSessionWords(nextSession)
    setWordIndex(0)
    typing.reset(nextSession[0].text)
  }, [createQueue, wordMemoryKey])

  const saveRun = useCallback(async (
    completed: boolean,
    finalWords: number,
    finalMaxStreak: number,
    finalDistance: number,
    finalStage: number,
    finalBadges: number,
  ) => {
    if (savedRef.current) return
    savedRef.current = true
    const timing = runClockRef.current.finish()
    const run: RunResult = {
      id: createRunId('chase'),
      gameId: 'chase',
      mode: 'copy',
      wordPackId: 'experience-grade-4',
      difficulty: difficultyRef.current.speedTier,
      speedTier: difficultyRef.current.speedTier,
      rulesVersion: CHASE_RULES_VERSION,
      challengeMode: 'endless',
      startStage: 1,
      highestStage: Math.max(1, finalStage),
      badgesRecovered: Math.max(0, finalBadges),
      startedAt: timing.startedAt,
      completedAt: timing.completedAt,
      durationMs: timing.durationMs,
      pausedMs: timing.pausedMs,
      completed,
      correctWords: finalWords,
      correctCharacters: correctCharactersRef.current,
      mistakes: mistakesRef.current,
      maxStreak: finalMaxStreak,
      score: finalWords * 120 + finalMaxStreak * 30 + finalBadges * 500 + Math.max(0, finalStage - 1) * 180,
      words: [...completedWordsRef.current],
      wordIds: [...completedWordIdsRef.current],
      mistakeWordIds: [...mistakeWordIdsRef.current],
      usedFullHints: true,
      remainingDistance: Math.round(finalDistance),
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
    void saveRun(
      badgesRecoveredRef.current > 0,
      completedWordsRef.current.length,
      maxStreakRef.current,
      distanceRef.current,
      stageLevelRef.current,
      badgesRecoveredRef.current,
    )
  }, [saveRun])

  useEffect(() => {
    if (status !== 'playing' || !runStarted) return
    let previousTick = performance.now()
    const timer = window.setInterval(() => {
      const currentTick = performance.now()
      const elapsed = Math.max(0, currentTick - previousTick)
      previousTick = currentTick
      const rules = getChaseStageRules(stageLevelRef.current)
      const elapsedSeconds = elapsed / 1_000
      const nextDistance = Math.min(CHASE_MAX_DISTANCE, distanceRef.current + rules.targetMetersPerSecond * elapsedSeconds)
      const nextOffset = worldOffsetRef.current + elapsedSeconds * (42 + rules.targetMetersPerSecond * 34)
      distanceRef.current = nextDistance
      worldOffsetRef.current = nextOffset
      setDistance(nextDistance)
      setWorldOffset(nextOffset)
      setRemainingMs((value) => Math.max(0, value - elapsed))
    }, 100)
    return () => window.clearInterval(timer)
  }, [runStarted, status])

  useEffect(() => {
    if (remainingMs > 0 || statusRef.current !== 'playing') return
    mistakeWordIdsRef.current.push(currentWord.id)
    setGameStatus(badgesRecoveredRef.current > 0 ? 'ended' : 'lost')
    audioService.play(badgesRecoveredRef.current > 0 ? 'run.success' : 'run.failure')
    void saveRun(
      badgesRecoveredRef.current > 0,
      correctWords,
      maxStreak,
      distanceRef.current,
      stageLevelRef.current,
      badgesRecoveredRef.current,
    )
  }, [correctWords, currentWord.id, maxStreak, remainingMs, saveRun, setGameStatus])

  useEffect(() => {
    if (distance < CHASE_MAX_DISTANCE || statusRef.current !== 'playing') return
    setGameStatus('lost')
    audioService.play('run.failure')
    void saveRun(
      badgesRecoveredRef.current > 0,
      correctWords,
      maxStreak,
      distanceRef.current,
      stageLevelRef.current,
      badgesRecoveredRef.current,
    )
  }, [correctWords, distance, maxStreak, saveRun, setGameStatus])

  const announceDistrict = useCallback((nextStage: number, nextBadges: number) => {
    setStageNotice(`徽章 ${nextBadges} 已找回！进入街区 ${nextStage}`)
    if (stageNoticeTimerRef.current !== null) window.clearTimeout(stageNoticeTimerRef.current)
    stageNoticeTimerRef.current = window.setTimeout(() => setStageNotice(null), 1_700)
  }, [])

  const handleComplete = useCallback(() => {
    if (statusRef.current !== 'playing') return
    const nextWords = correctWords + 1
    const nextStreak = streak + 1
    const nextMax = Math.max(maxStreak, nextStreak)
    const gain = chaseWordGain(currentWord.text.length, nextStreak, stageLevelRef.current)
    const caughtTarget = distanceRef.current - gain <= 0
    const nextBadges = caughtTarget ? badgesRecoveredRef.current + 1 : badgesRecoveredRef.current
    const nextStage = caughtTarget ? stageLevelRef.current + 1 : stageLevelRef.current
    const nextDistance = caughtTarget
      ? getChaseStageRules(nextStage).startingDistance
      : Math.max(0, distanceRef.current - gain)
    const attempts = correctCharactersRef.current + mistakesRef.current
    const accuracy = attempts === 0 ? 1 : correctCharactersRef.current / attempts
    const adapted = adaptDifficulty(difficultyRef.current, accuracy, nextWords)
    const nextDifficulty = endlessDifficultyForStage({
      ...adapted,
      speedTier: Math.max(difficultyRef.current.speedTier, adapted.speedTier) as typeof adapted.speedTier,
      hintLevel: Math.min(difficultyRef.current.hintLevel, adapted.hintLevel) as typeof adapted.hintLevel,
    }, nextStage)

    let nextSession = sessionWords
    let nextIndex = wordIndex + 1
    if (nextIndex >= nextSession.length) {
      nextSession = createQueue(currentWord.id)
      nextIndex = 0
      setSessionWords(nextSession)
    }

    difficultyRef.current = nextDifficulty
    distanceRef.current = nextDistance
    stageLevelRef.current = nextStage
    badgesRecoveredRef.current = nextBadges
    maxStreakRef.current = nextMax
    completedWordsRef.current.push(currentWord.text)
    completedWordIdsRef.current.push(currentWord.id)
    setDifficulty(nextDifficulty)
    setDistance(nextDistance)
    setCorrectWords(nextWords)
    setStreak(nextStreak)
    setMaxStreak(nextMax)
    setStageLevel(nextStage)
    setBadgesRecovered(nextBadges)
    setWordIndex(nextIndex)
    audioService.play(caughtTarget ? 'chase.catch' : 'chase.step')
    if (caughtTarget) {
      audioService.play('level.up')
      announceDistrict(nextStage, nextBadges)
    }
    if ([5, 10, 20].includes(nextStreak)) audioService.play('combo.up')
    audioService.speak(currentWord.text)
  }, [announceDistrict, correctWords, createQueue, currentWord.id, currentWord.text, maxStreak, sessionWords, streak, wordIndex])

  useEffect(() => {
    const event = typing.lastEvent
    if (!event || event.sequence === processedSequenceRef.current) return
    processedSequenceRef.current = event.sequence
    if (!runClockRef.current.hasStarted) {
      runClockRef.current.start()
      setRunStarted(true)
    }
    if (event.type === 'correct' || event.type === 'complete') correctCharactersRef.current += 1
    if (event.type === 'correct') audioService.play('typing.correct')
    if (event.type === 'mistake') {
      mistakesRef.current += 1
      mistakeWordIdsRef.current.push(currentWord.id)
      setStreak(0)
      setStumble(true)
      const boundedPenalty = Math.min(3, 1.4 + stageLevelRef.current * 0.12)
      distanceRef.current = Math.min(CHASE_MAX_DISTANCE, distanceRef.current + boundedPenalty)
      setDistance(distanceRef.current)
      window.setTimeout(() => setStumble(false), 320)
      audioService.play('typing.wrong')
    }
    if (event.type === 'complete') handleComplete()
  }, [currentWord.id, handleComplete, typing.lastEvent])

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
    const nextSession = createQueue()
    runClockRef.current.reset()
    mistakesRef.current = 0
    correctCharactersRef.current = 0
    completedWordsRef.current = []
    completedWordIdsRef.current = []
    mistakeWordIdsRef.current = []
    processedSequenceRef.current = 0
    savedRef.current = false
    difficultyRef.current = INITIAL_DIFFICULTY
    distanceRef.current = CHASE_START_DISTANCE
    stageLevelRef.current = 1
    badgesRecoveredRef.current = 0
    worldOffsetRef.current = 0
    maxStreakRef.current = 0
    statusRef.current = 'playing'
    setStorageWarning(false)
    setSessionWords(nextSession)
    setRunStarted(false)
    setFinalDurationMs(null)
    setFinalBreakdown(null)
    setDifficulty(INITIAL_DIFFICULTY)
    setWordIndex(0)
    setDistance(CHASE_START_DISTANCE)
    setRemainingMs(CHASE_RUN_DURATION_MS)
    setCorrectWords(0)
    setStreak(0)
    setMaxStreak(0)
    setStageLevel(1)
    setBadgesRecovered(0)
    setWorldOffset(0)
    setStageNotice(null)
    setGameStatus('playing')
    typing.reset(nextSession[0].text)
  }

  const finishRun = async () => {
    if (!runClockRef.current.hasStarted || statusRef.current !== 'playing') return
    setGameStatus('ended')
    audioService.play('run.success')
    await saveRun(true, correctWords, maxStreak, distanceRef.current, stageLevelRef.current, badgesRecoveredRef.current)
  }

  const stageRules = getChaseStageRules(stageLevel)
  const targetPosition = Math.min(90, 72 + Math.sin(worldOffset / 52) * 5)
  const policePosition = Math.max(4, targetPosition - distance / CHASE_MAX_DISTANCE * 62)
  const stageProgress = Math.max(0, Math.min(100, (1 - distance / stageRules.startingDistance) * 100))
  const liveScore = correctWords * 120 + maxStreak * 30 + badgesRecovered * 500
  const rewardDetail = finalBreakdown
    ? `获得 ${finalBreakdown.total} 冒险积分：基础 ${finalBreakdown.basePoints} + 街区 ${finalBreakdown.stageBonus} + 徽章 ${finalBreakdown.badgeBonus} + 准确 ${finalBreakdown.accuracyBonus}。`
    : ''
  const cityStyle = {
    '--city-scroll': `${-(worldOffset % 520)}px`,
    '--police-left': `${policePosition}%`,
    '--target-left': `${targetPosition}%`,
  } as CSSProperties

  return (
    <GameShell title="城市追踪战" subtitle={`连续街区 · 还剩 ${Math.ceil(remainingMs / 1000)} 秒`} audioSettings={audioSettings} navigate={navigate} toggleAudio={toggleAudio}>
      <main className={`chase-game-layout ${equippedRewards.cityTheme === 'city-sunset' ? 'city-sunset-equipped' : ''}`}>
        <section className="chase-stage-card">
          <div className="chase-control-strip">
            <div className="chase-mini-map" aria-label={`当前街区 ${stageLevel}，已追回 ${badgesRecovered} 枚徽章`}>
              {Array.from({ length: 6 }, (_, index) => <i className={index === stageRules.districtTheme ? 'active' : ''} key={index} />)}
              <span>街区 {stageLevel}</span>
            </div>
            <button className="end-run-button" disabled={!runStarted || status !== 'playing'} onClick={() => void finishRun()}>结束巡逻并结算</button>
          </div>
          <div className="game-hud chase-hud">
            <span><Icon name="timer" /><b>{Math.ceil(remainingMs / 1000)}</b> 秒</span>
            <span>街区 <b>{stageLevel}</b></span>
            <span>徽章 <b>{badgesRecovered}</b></span>
            <span>连续 <b>{streak}</b></span>
            <span>距离 <b>{Math.round(distance)}</b> 米</span>
            <span>目标 <b>{stageRules.targetMetersPerSecond.toFixed(2)}</b> 米/秒</span>
            <span>本局 <b>{liveScore}</b> 分</span>
          </div>
          <div className="chase-progress" aria-label={`本街区追赶进度 ${Math.round(stageProgress)}%`}><i style={{ width: `${stageProgress}%` }} /></div>
          <div className={`city-stage district-${stageRules.districtTheme}`} style={cityStyle} aria-label={`巡逻员距离移动目标还有 ${Math.round(distance)} 米`}>
            <div className="city-scrolling-world" aria-hidden="true">
              {Array.from({ length: 16 }, (_, index) => <i style={{ height: 44 + (index * 17) % 68 }} key={index} />)}
            </div>
            <div className="city-road" />
            <div className={`police-runner ${stumble ? 'stumble' : ''}`}><span /><b>巡逻员</b></div>
            <div className="thief-runner"><span /><b>徽章目标</b></div>
            <div className="chase-message" aria-live="polite">{stageNotice ?? (runStarted ? '目标持续移动，准确完成单词来缩短距离' : '按下第一个字母后，双方同时出发')}</div>
          </div>
        </section>
        <TypingPrompt word={currentWord} snapshot={typing.snapshot} hintLevel={difficulty.hintLevel} onSpeak={() => audioService.speak(currentWord.text)} />
      </main>
      {storageWarning && <p className="storage-warning" role="status">本局暂存在当前页面，请保持页面开启后再继续练习。</p>}
      {status === 'paused' && <ResultOverlay state="paused" title="追踪已暂停" detail="目标、巡逻员和计时都已暂停，准备好后继续。" onPrimary={() => { runClockRef.current.resume(); setGameStatus('playing') }} primaryLabel="继续追踪" onExit={() => navigate('home')} />}
      {status === 'ended' && <ResultOverlay state="won" title="本次城市巡逻已结算" detail={`追回 ${badgesRecovered} 枚徽章，到达街区 ${stageLevel}，完成 ${correctWords} 个单词，活跃 ${Math.round((finalDurationMs ?? 0) / 1000)} 秒。${rewardDetail}`} onPrimary={restart} primaryLabel="再次巡逻" onExit={() => navigate('home')} />}
      {status === 'lost' && <ResultOverlay state="lost" title="线索还在" detail={`已追回 ${badgesRecovered} 枚徽章，到达街区 ${stageLevel}，目标距离 ${Math.round(distance)} 米。${rewardDetail}`} onPrimary={restart} primaryLabel="重新追踪" onExit={() => navigate('home')} />}
    </GameShell>
  )
}
