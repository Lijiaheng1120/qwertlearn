import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AudioSettings } from '../core/audio-service'
import { audioService } from '../core/audio-service'
import {
  getMatchEndlessRoundRules,
  getMatchStageRules,
  MATCH_AUTO_ADVANCE_DELAY_MS,
  MATCH_ENDLESS_RULES_VERSION,
  MATCH_FINAL_STAGE,
  MATCH_MAX_FAILURES,
  MATCH_RULES_VERSION,
} from '../core/challenge-progression'
import {
  createRunId,
  DEFAULT_VOCABULARY_LEVEL,
  getVocabularyLevel,
  VOCABULARY_LEVELS,
  type ChallengeMode,
  type RunResult,
  type RunRewardBreakdown,
  type VocabularyLevelId,
  type WordEntry,
  type WordMemory,
} from '../core/models'
import type { MatchCardSelection } from '../core/match-engine'
import { progressStore } from '../core/progress-store'
import { ActiveRunClock } from '../core/run-clock'
import { useMatchSession } from '../core/use-match-session'
import { createWordSession } from '../core/word-session'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'
import { GameShell, ResultOverlay } from './GameShell'

interface MatchGamePageProps {
  audioSettings: AudioSettings
  wordMemory?: WordMemory[]
  initialEndlessUnlocked?: boolean
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

type MatchStatus = 'playing' | 'stage-clear' | 'round-failed' | 'paused' | 'won' | 'lost' | 'ended'

interface MatchRound {
  words: WordEntry[]
  meanings: WordEntry[]
}

function shuffle<T>(values: T[], random = Math.random): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function createMatchRound(
  levelId: VocabularyLevelId,
  stageLevel: number,
  wordMemory: WordMemory[],
  excludedWordIds: readonly string[] = [],
  challengeMode: ChallengeMode = 'learning',
  random = Math.random,
): MatchRound {
  const level = getVocabularyLevel(levelId)
  const rules = challengeMode === 'endless'
    ? getMatchEndlessRoundRules(stageLevel)
    : getMatchStageRules(stageLevel)
  const excluded = new Set(excludedWordIds)
  const eligible = level.words.filter((word) => word.difficulty <= rules.maxWordDifficulty)
  const fresh = eligible.filter((word) => !excluded.has(word.id))
  const candidates = fresh.length >= rules.pairCount ? fresh : eligible
  const words = createWordSession(candidates, wordMemory, { length: rules.pairCount, random })
  return { words, meanings: shuffle(words, random) }
}

export function MatchGamePage({
  audioSettings,
  wordMemory = [],
  initialEndlessUnlocked = false,
  navigate,
  toggleAudio,
  onRunSaved,
}: MatchGamePageProps) {
  const [selectedLevel, setSelectedLevel] = useState<VocabularyLevelId>(DEFAULT_VOCABULARY_LEVEL)
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('learning')
  const [endlessUnlocked, setEndlessUnlocked] = useState(initialEndlessUnlocked)
  const [stageLevel, setStageLevel] = useState(1)
  const [round, setRound] = useState(() => createMatchRound(DEFAULT_VOCABULARY_LEVEL, 1, wordMemory))
  const [status, setStatus] = useState<MatchStatus>('playing')
  const [runStarted, setRunStarted] = useState(false)
  const [roundStarted, setRoundStarted] = useState(false)
  const [failures, setFailures] = useState(0)
  const [correctPairs, setCorrectPairs] = useState(0)
  const [totalMistakes, setTotalMistakes] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [message, setMessage] = useState('选择一张词卡开始吧')
  const [wrongWordIds, setWrongWordIds] = useState<string[]>([])
  const [storageWarning, setStorageWarning] = useState(false)
  const [finalDurationMs, setFinalDurationMs] = useState<number | null>(null)
  const [finalBreakdown, setFinalBreakdown] = useState<RunRewardBreakdown | null>(null)
  const match = useMatchSession()

  const runClockRef = useRef(new ActiveRunClock())
  const mountedRef = useRef(true)
  const savedRef = useRef(false)
  const statusRef = useRef<MatchStatus>('playing')
  const stageLevelRef = useRef(1)
  const highestStageRef = useRef(1)
  const selectedLevelRef = useRef<VocabularyLevelId>(DEFAULT_VOCABULARY_LEVEL)
  const challengeModeRef = useRef<ChallengeMode>('learning')
  const roundStartedRef = useRef(false)
  const failuresRef = useRef(0)
  const correctPairsRef = useRef(0)
  const mistakesRef = useRef(0)
  const maxStreakRef = useRef(0)
  const completedWordsRef = useRef<string[]>([])
  const completedWordIdsRef = useRef<string[]>([])
  const mistakeWordIdsRef = useRef<string[]>([])
  const usedWordIdsRef = useRef<string[]>([])
  const activeSelectionWordIdRef = useRef<string | null>(null)
  const processedSequenceRef = useRef(0)
  const wrongTimerRef = useRef<number | null>(null)

  const rules = challengeMode === 'endless'
    ? getMatchEndlessRoundRules(stageLevel)
    : getMatchStageRules(stageLevel)
  const selectedLevelDefinition = getVocabularyLevel(selectedLevel)
  const wordMemoryKey = wordMemory.map((word) => `${word.wordId}:${word.lastPracticedAt}:${word.needsReview}`).join('|')
  const wordsById = useMemo(() => new Map(round.words.map((word) => [word.id, word])), [round.words])

  const setGameStatus = useCallback((nextStatus: MatchStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  useEffect(() => {
    if (initialEndlessUnlocked) setEndlessUnlocked(true)
  }, [initialEndlessUnlocked])

  const buildRound = useCallback((
    levelId: VocabularyLevelId,
    nextStage: number,
    nextMode: ChallengeMode = challengeModeRef.current,
    excluded = usedWordIdsRef.current,
  ) => createMatchRound(levelId, nextStage, wordMemory, excluded, nextMode), [wordMemoryKey])

  const saveRun = useCallback(async (completed: boolean, finalStage: number) => {
    if (savedRef.current || !runClockRef.current.hasStarted) return
    savedRef.current = true
    const timing = runClockRef.current.finish()
    const level = getVocabularyLevel(selectedLevelRef.current)
    const finalPairs = completedWordIdsRef.current.length
    if (
      !completed
      && activeSelectionWordIdRef.current
      && !mistakeWordIdsRef.current.includes(activeSelectionWordIdRef.current)
    ) {
      mistakeWordIdsRef.current.push(activeSelectionWordIdRef.current)
    }
    const run: RunResult = {
      id: createRunId('match'),
      gameId: 'match',
      mode: 'recall',
      wordPackId: level.wordPackId,
      difficulty: 1,
      speedTier: 1,
      rulesVersion: challengeModeRef.current === 'endless' ? MATCH_ENDLESS_RULES_VERSION : MATCH_RULES_VERSION,
      challengeMode: challengeModeRef.current,
      startStage: 1,
      highestStage: Math.max(1, finalStage),
      badgesRecovered: 0,
      startedAt: timing.startedAt,
      completedAt: timing.completedAt,
      durationMs: timing.durationMs,
      pausedMs: timing.pausedMs,
      completed,
      correctWords: finalPairs,
      correctCharacters: finalPairs,
      mistakes: mistakesRef.current,
      failures: failuresRef.current,
      maxStreak: maxStreakRef.current,
      score: finalPairs * 120 + maxStreakRef.current * 30 + Math.max(0, finalStage - 1) * 250,
      words: [...completedWordsRef.current],
      wordIds: [...completedWordIdsRef.current],
      mistakeWordIds: [...mistakeWordIdsRef.current],
      usedFullHints: false,
    }
    if (mountedRef.current) {
      setFinalDurationMs(timing.durationMs)
      setFinalBreakdown(progressStore.previewRunReward(run))
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

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current)
      if (runClockRef.current.hasStarted && !savedRef.current) {
        void saveRun(false, highestStageRef.current)
      }
    }
  }, [saveRun])

  useEffect(() => {
    if (runClockRef.current.hasStarted || statusRef.current !== 'playing') return
    const nextRound = buildRound(selectedLevelRef.current, 1, challengeModeRef.current, [])
    const nextRules = challengeModeRef.current === 'endless'
      ? getMatchEndlessRoundRules(1)
      : getMatchStageRules(1)
    setRound(nextRound)
    setRemainingMs(nextRules.roundDurationMs)
    match.reset()
  }, [buildRound, wordMemoryKey])

  useEffect(() => {
    activeSelectionWordIdRef.current = match.snapshot.selected?.wordId ?? null
  }, [match.snapshot.selected])

  useEffect(() => {
    const event = match.snapshot.lastEvent
    if (!event || event.sequence <= processedSequenceRef.current) return
    processedSequenceRef.current = event.sequence

    if (event.type === 'selected') {
      const word = wordsById.get(event.selection.wordId)
      setMessage(event.selection.side === 'english' ? '再找出它的中文意思' : '再找出对应的英文单词')
      audioService.play('ui.click')
      if (word && event.selection.side === 'english') audioService.speak(word.text)
      return
    }
    if (event.type === 'deselected') {
      setMessage('已取消选择，再挑一张卡吧')
      return
    }
    if (event.type === 'mismatched') {
      mistakesRef.current += 1
      setTotalMistakes(mistakesRef.current)
      mistakeWordIdsRef.current.push(event.first.wordId, event.second.wordId)
      setWrongWordIds([event.first.wordId, event.second.wordId])
      setMessage('还不是这一对，记住位置再试一次')
      audioService.play('match.wrong')
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current)
      wrongTimerRef.current = window.setTimeout(() => setWrongWordIds([]), 520)
      return
    }
    if (event.type !== 'matched') return

    const word = wordsById.get(event.wordId)
    if (!word) return
    completedWordsRef.current.push(word.text)
    completedWordIdsRef.current.push(word.id)
    usedWordIdsRef.current.push(word.id)
    correctPairsRef.current += 1
    maxStreakRef.current = Math.max(maxStreakRef.current, event.streak)
    setCorrectPairs(correctPairsRef.current)
    setMaxStreak(maxStreakRef.current)
    setMessage(`配对成功！${word.text} 就是“${word.meaning}”`)
    audioService.play('match.correct')
    audioService.speak(word.text)
    if ([3, 5, 8].includes(event.streak)) audioService.play('combo.up')

    if (match.snapshot.matchedWordIds.length !== round.words.length) return
    roundStartedRef.current = false
    setRoundStarted(false)
    runClockRef.current.pause()
    audioService.play('match.clear')
    if (challengeModeRef.current === 'learning' && stageLevelRef.current >= MATCH_FINAL_STAGE) {
      highestStageRef.current = MATCH_FINAL_STAGE
      setEndlessUnlocked(true)
      setGameStatus('won')
      audioService.play('run.success')
      void saveRun(true, MATCH_FINAL_STAGE)
      return
    }
    setGameStatus('stage-clear')
    setMessage(challengeModeRef.current === 'endless'
      ? `第 ${stageLevelRef.current} 轮完成，花园继续生长！`
      : `第 ${stageLevelRef.current} 关完成，花园开出新花啦！`)
    audioService.play('level.up')
  }, [match.snapshot.lastEvent, match.snapshot.matchedWordIds.length, round.words.length, saveRun, setGameStatus, wordsById])

  useEffect(() => {
    if (!['stage-clear', 'round-failed'].includes(status)) return
    const transitionStatus = status
    const timer = window.setTimeout(() => {
      if (statusRef.current !== transitionStatus) return
      const nextMode = challengeModeRef.current
      const retryingRound = transitionStatus === 'round-failed'
      const nextStage = retryingRound
        ? stageLevelRef.current
        : nextMode === 'endless'
          ? stageLevelRef.current + 1
          : Math.min(MATCH_FINAL_STAGE, stageLevelRef.current + 1)
      const nextRules = nextMode === 'endless'
        ? getMatchEndlessRoundRules(nextStage)
        : getMatchStageRules(nextStage)
      stageLevelRef.current = nextStage
      highestStageRef.current = Math.max(highestStageRef.current, nextStage)
      setStageLevel(nextStage)
      setRound(buildRound(selectedLevelRef.current, nextStage, nextMode))
      setRemainingMs(nextRules.roundDurationMs)
      setMessage(retryingRound
        ? `第 ${nextStage} 轮重新开始，慢慢找出每一对词卡`
        : nextMode === 'endless'
          ? `第 ${nextStage} 轮开始，继续让花园生长`
          : '新一关开始，选择任意一张词卡')
      setGameStatus('playing')
      match.reset()
    }, MATCH_AUTO_ADVANCE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [buildRound, match.reset, setGameStatus, status])

  useEffect(() => {
    if (status !== 'playing' || !roundStarted || remainingMs === null) return
    let previousTick = performance.now()
    const timer = window.setInterval(() => {
      const currentTick = performance.now()
      const elapsed = Math.max(0, currentTick - previousTick)
      previousTick = currentTick
      setRemainingMs((value) => value === null ? null : Math.max(0, value - elapsed))
    }, 100)
    return () => window.clearInterval(timer)
  }, [roundStarted, stageLevel, status])

  useEffect(() => {
    if (remainingMs !== 0 || statusRef.current !== 'playing' || !roundStartedRef.current) return
    const unresolved = round.words.filter((word) => !match.snapshot.matchedWordIds.includes(word.id))
    mistakesRef.current += unresolved.length
    setTotalMistakes(mistakesRef.current)
    mistakeWordIdsRef.current.push(...unresolved.map((word) => word.id))
    roundStartedRef.current = false
    setRoundStarted(false)
    runClockRef.current.pause()

    if (challengeModeRef.current === 'endless') {
      const nextFailures = failuresRef.current + 1
      failuresRef.current = nextFailures
      setFailures(nextFailures)
      if (nextFailures >= MATCH_MAX_FAILURES) {
        setGameStatus('lost')
        audioService.play('run.failure')
        void saveRun(false, stageLevelRef.current)
        return
      }
      setMessage(`第 ${stageLevelRef.current} 轮超时，失败 ${nextFailures}/${MATCH_MAX_FAILURES}，即将换牌重试`)
      setGameStatus('round-failed')
      audioService.play('match.wrong')
      return
    }

    setGameStatus('lost')
    audioService.play('run.failure')
    void saveRun(false, stageLevelRef.current)
  }, [match.snapshot.matchedWordIds, remainingMs, round.words, saveRun, setGameStatus])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && statusRef.current === 'playing' && runClockRef.current.hasStarted) {
        runClockRef.current.pause()
        setGameStatus('paused')
      }
      if (!document.hidden && statusRef.current === 'paused') {
        if (roundStartedRef.current) runClockRef.current.resume()
        setGameStatus('playing')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [setGameStatus])

  const selectCard = (selection: MatchCardSelection) => {
    if (statusRef.current !== 'playing') return
    if (!runClockRef.current.hasStarted) {
      runClockRef.current.start()
      setRunStarted(true)
    } else if (!roundStartedRef.current) {
      runClockRef.current.resume()
    }
    if (!roundStartedRef.current) {
      roundStartedRef.current = true
      setRoundStarted(true)
    }
    match.select(selection)
  }

  const changeLevel = (levelId: VocabularyLevelId) => {
    if (runClockRef.current.hasStarted) return
    const nextMode = challengeModeRef.current
    const nextRules = nextMode === 'endless' ? getMatchEndlessRoundRules(1) : getMatchStageRules(1)
    selectedLevelRef.current = levelId
    setSelectedLevel(levelId)
    setRound(buildRound(levelId, 1, nextMode, []))
    setRemainingMs(nextRules.roundDurationMs)
    setMessage(nextMode === 'endless' ? '选择一张词卡，开始无尽第 1 轮' : '选择一张词卡开始吧')
    match.reset()
  }

  const endRun = async () => {
    if (!runClockRef.current.hasStarted || !['playing', 'stage-clear'].includes(statusRef.current)) return
    setGameStatus('ended')
    audioService.play('run.success')
    await saveRun(challengeModeRef.current === 'endless', highestStageRef.current)
  }

  const reset = (
    nextMode: ChallengeMode = challengeModeRef.current,
    levelId = selectedLevelRef.current,
  ) => {
    const nextRules = nextMode === 'endless' ? getMatchEndlessRoundRules(1) : getMatchStageRules(1)
    const nextRound = createMatchRound(levelId, 1, wordMemory, [], nextMode)
    runClockRef.current.reset()
    savedRef.current = false
    statusRef.current = 'playing'
    stageLevelRef.current = 1
    highestStageRef.current = 1
    selectedLevelRef.current = levelId
    challengeModeRef.current = nextMode
    roundStartedRef.current = false
    failuresRef.current = 0
    correctPairsRef.current = 0
    mistakesRef.current = 0
    maxStreakRef.current = 0
    completedWordsRef.current = []
    completedWordIdsRef.current = []
    mistakeWordIdsRef.current = []
    usedWordIdsRef.current = []
    activeSelectionWordIdRef.current = null
    setSelectedLevel(levelId)
    setChallengeMode(nextMode)
    setStageLevel(1)
    setRound(nextRound)
    setStatus('playing')
    setRunStarted(false)
    setRoundStarted(false)
    setFailures(0)
    setCorrectPairs(0)
    setTotalMistakes(0)
    setMaxStreak(0)
    setRemainingMs(nextRules.roundDurationMs)
    setMessage(nextMode === 'endless' ? '选择一张词卡，开始无尽第 1 轮' : '选择一张词卡开始吧')
    setWrongWordIds([])
    setStorageWarning(false)
    setFinalDurationMs(null)
    setFinalBreakdown(null)
    match.reset()
  }

  const matchedWordIds = new Set(match.snapshot.matchedWordIds)
  const selected = match.snapshot.selected
  const roundProgress = round.words.length === 0 ? 0 : matchedWordIds.size / round.words.length * 100
  const timerProgress = rules.roundDurationMs && remainingMs !== null
    ? Math.max(0, remainingMs / rules.roundDurationMs * 100)
    : 100
  const rewardDetail = finalBreakdown
    ? `获得 ${finalBreakdown.total} 冒险积分：基础 ${finalBreakdown.basePoints} + 关卡 ${finalBreakdown.stageBonus} + 准确 ${finalBreakdown.accuracyBonus}。`
    : ''

  const cardClass = (wordId: string, side: MatchCardSelection['side']) => [
    'match-word-card',
    side === 'meaning' ? 'meaning' : '',
    selected?.wordId === wordId && selected.side === side ? 'selected' : '',
    wrongWordIds.includes(wordId) ? 'wrong' : '',
    matchedWordIds.has(wordId) ? 'matched' : '',
  ].filter(Boolean).join(' ')

  return (
    <GameShell
      title="词语花园连连看"
      subtitle={challengeMode === 'endless'
        ? `${selectedLevelDefinition.shortLabel} · 无尽挑战第 ${stageLevel} 轮`
        : `${selectedLevelDefinition.shortLabel} · ${rules.label}第 ${stageLevel} 关`}
      audioSettings={audioSettings}
      navigate={navigate}
      toggleAudio={toggleAudio}
    >
      <main className="match-game-layout">
        <section className="match-garden-card">
          <div className="challenge-track-switch match-challenge-switch" role="group" aria-label="词语花园挑战路线">
            <button aria-pressed={challengeMode === 'learning'} disabled={runStarted} onClick={() => reset('learning')}>
              <strong>普通学习</strong><small>4 / 6 / 8 对 · 三关自动进阶</small>
            </button>
            <button aria-pressed={challengeMode === 'endless'} disabled={runStarted || !endlessUnlocked} onClick={() => reset('endless')}>
              <strong>无尽挑战</strong><small>{endlessUnlocked ? '8 / 10 / 12 对 · 三次失败结束' : '完整通过普通三关后解锁'}</small>
            </button>
            <button className="end-run-button" disabled={!runStarted || !['playing', 'stage-clear'].includes(status)} onClick={() => void endRun()}>结束本局并结算</button>
          </div>
          <div className="match-level-switch" role="group" aria-label="选择词库等级">
            {VOCABULARY_LEVELS.map((level) => (
              <button
                aria-pressed={selectedLevel === level.id}
                disabled={runStarted}
                key={level.id}
                onClick={() => changeLevel(level.id)}
              >
                <strong>{level.shortLabel}</strong>
                <small>{level.words.length} 词</small>
              </button>
            ))}
          </div>

          <div className="match-hud">
            <span><Icon name="star" />{challengeMode === 'endless' ? <>第 <b>{stageLevel}</b> 轮</> : <>第 <b>{stageLevel}</b> / {MATCH_FINAL_STAGE} 关</>}</span>
            <span>{challengeMode === 'endless' ? '本轮' : '本关'} <b>{matchedWordIds.size}/{round.words.length}</b> 对</span>
            {challengeMode === 'endless' && <span className="match-failure-count" aria-label={`失败 ${failures} 次，最多 ${MATCH_MAX_FAILURES} 次`}>失败 <b>{failures}/{MATCH_MAX_FAILURES}</b></span>}
            <span>连续 <b>{match.snapshot.streak}</b></span>
            <span>错配 <b>{totalMistakes}</b></span>
            <span>{remainingMs === null ? '轻松练习 · 不限时' : <><Icon name="timer" /><b>{Math.ceil(remainingMs / 1000)}</b> 秒</>}</span>
          </div>
          <div className="match-progress" aria-label={`本关已完成 ${matchedWordIds.size} 对，共 ${round.words.length} 对`}><i style={{ width: `${roundProgress}%` }} /></div>
          {remainingMs !== null && <div className="match-timer" aria-label="本关剩余时间"><i style={{ width: `${timerProgress}%` }} /></div>}

          <div className="match-message" role="status" aria-live="polite">{message}</div>
          <div className="match-columns">
            <div className="match-column">
              <h2>ENGLISH <span>英文</span></h2>
              <div className="match-card-list">
                {round.words.map((word) => (
                  <button
                    className={cardClass(word.id, 'english')}
                    disabled={matchedWordIds.has(word.id) || status !== 'playing'}
                    aria-pressed={selected?.wordId === word.id && selected.side === 'english'}
                    aria-label={`${word.text} 英文卡`}
                    key={`english-${word.id}`}
                    onClick={() => selectCard({ wordId: word.id, side: 'english' })}
                  >{word.text}</button>
                ))}
              </div>
            </div>

            <div className="match-garden-path" aria-hidden="true">
              <span>🌱</span><i /><i /><span>🌼</span><i /><i /><span>🌻</span>
            </div>

            <div className="match-column">
              <h2>中文 <span>MEANING</span></h2>
              <div className="match-card-list">
                {round.meanings.map((word) => (
                  <button
                    className={cardClass(word.id, 'meaning')}
                    disabled={matchedWordIds.has(word.id) || status !== 'playing'}
                    aria-pressed={selected?.wordId === word.id && selected.side === 'meaning'}
                    aria-label={`${word.meaning} 中文卡`}
                    key={`meaning-${word.id}`}
                    onClick={() => selectCard({ wordId: word.id, side: 'meaning' })}
                  >{word.meaning}</button>
                ))}
              </div>
            </div>
          </div>

          {status === 'stage-clear' && (
            <div className="match-stage-clear" role="status">
              <span>🌼</span>
              {challengeMode === 'endless'
                ? <div><strong>第 {stageLevel} 轮完成！</strong><small>下一轮增加到 {getMatchEndlessRoundRules(stageLevel + 1).pairCount} 对，花园会自动继续生长。</small></div>
                : <div><strong>{rules.label}关完成！</strong><small>下一关增加到 {getMatchStageRules(stageLevel + 1).pairCount} 对，花园会自动继续生长。</small></div>}
              <p className="match-auto-advance"><Icon name="arrow" />自动进入第 {stageLevel + 1} {challengeMode === 'endless' ? '轮' : '关'}</p>
            </div>
          )}
          {status === 'round-failed' && (
            <div className="match-stage-clear failed" role="status">
              <span>🍂</span>
              <div><strong>第 {stageLevel} 轮超时，失败 {failures}/{MATCH_MAX_FAILURES}</strong><small>换一组词卡，自动重试当前轮次，不会提高难度。</small></div>
              <p className="match-auto-advance"><Icon name="arrow" />自动重试第 {stageLevel} 轮</p>
            </div>
          )}
        </section>

        <aside className="match-guide-card">
          <div className="match-bee" aria-hidden="true"><span>🐝</span><i /></div>
          <h2>小蜜蜂的提示</h2>
          <p>{challengeMode === 'endless'
            ? '每轮完成后自动继续；超时会换牌重试当前轮，累计三次失败才结束。普通错配只会重置连击。'
            : '先点英文或中文，再找另一边对应的词。选错不会扣掉已经完成的花朵。'}</p>
          <dl>
            <div><dt>当前词库</dt><dd>{selectedLevelDefinition.label}</dd></div>
            <div><dt>词汇总量</dt><dd>{selectedLevelDefinition.words.length} 词</dd></div>
            <div><dt>{challengeMode === 'endless' ? '本轮难度' : '本关难度'}</dt><dd>1～{rules.maxWordDifficulty} 级</dd></div>
            <div><dt>最高连击</dt><dd>{maxStreak}</dd></div>
            {challengeMode === 'endless' && <div><dt>失败次数</dt><dd>{failures}/{MATCH_MAX_FAILURES}</dd></div>}
          </dl>
          <p className="match-level-description">{selectedLevelDefinition.description}</p>
          <button className="match-speak-help" disabled={!selected} onClick={() => {
            const word = selected ? wordsById.get(selected.wordId) : null
            if (word) audioService.speak(word.text)
          }}><Icon name="sound" />朗读当前英文</button>
        </aside>
      </main>

      {storageWarning && <p className="storage-warning" role="status">本局暂存在当前页面，请保持页面开启后再继续练习。</p>}
      {status === 'paused' && <ResultOverlay state="paused" title="花园已暂停" detail="计时和配对都已暂停，页面显示后会从当前位置继续。" onPrimary={() => { runClockRef.current.resume(); setGameStatus('playing') }} primaryLabel="继续配对" onExit={() => navigate('home')} />}
      {status === 'won' && <ResultOverlay state="won" title="词语花园盛开了！" detail={`完成 ${correctPairs} 对，到达第 ${stageLevel} 关，活跃 ${Math.round((finalDurationMs ?? 0) / 1000)} 秒。${rewardDetail}`} onPrimary={() => reset('learning')} primaryLabel="再种一座花园" onExit={() => navigate('home')} />}
      {status === 'lost' && <ResultOverlay state="lost" title={challengeMode === 'endless' ? '无尽花园暂时休息' : '花朵等你再来'} detail={challengeMode === 'endless' ? `累计失败 ${failures}/${MATCH_MAX_FAILURES} 次，本局结束；完成 ${correctPairs} 对，到达第 ${stageLevel} 轮。${rewardDetail}` : `完成 ${correctPairs} 对，到达第 ${stageLevel} 关。未完成词已经加入后续复习。${rewardDetail}`} onPrimary={() => reset(challengeModeRef.current)} primaryLabel={challengeMode === 'endless' ? '重新挑战' : '重新开始'} onExit={() => navigate('home')} />}
      {status === 'ended' && <ResultOverlay state="won" title={challengeMode === 'endless' ? '本次无尽花园已结算' : '本次花园练习已结算'} detail={`完成 ${correctPairs} 对，到达第 ${stageLevel} ${challengeMode === 'endless' ? '轮' : '关'}。${rewardDetail}`} onPrimary={() => reset(challengeModeRef.current)} primaryLabel={challengeMode === 'endless' ? '继续挑战' : '继续练习'} onExit={() => navigate('home')} />}
    </GameShell>
  )
}
