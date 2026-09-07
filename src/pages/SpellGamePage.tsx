import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { AudioSettings } from '../core/audio-service'
import { audioService } from '../core/audio-service'
import {
  getSpellStageRules,
  SPELL_AUTO_ADVANCE_DELAY_MS,
  SPELL_FINAL_STAGE,
  SPELL_RULES_VERSION,
  SPELL_RUN_WORD_COUNT,
  SPELL_WORDS_PER_STAGE,
  spellStageForCompletedWords,
  spellWordsIntoStage,
} from '../core/challenge-progression'
import {
  createRunId,
  DEFAULT_VOCABULARY_LEVEL,
  getVocabularyLevel,
  VOCABULARY_LEVELS,
  type RunResult,
  type RunRewardBreakdown,
  type VocabularyLevelId,
  type WordEntry,
  type WordMemory,
} from '../core/models'
import { progressStore } from '../core/progress-store'
import { ActiveRunClock } from '../core/run-clock'
import {
  buildSpellHint,
  createSpellLetterOrder,
  nextSpellMistakeStreak,
} from '../core/spell-engine'
import { useTypingSession } from '../core/use-typing-session'
import { createWordSession } from '../core/word-session'
import type { AppRoute } from '../App'
import { Icon } from '../ui/Icon'
import { GameShell, ResultOverlay } from './GameShell'

interface SpellGamePageProps {
  audioSettings: AudioSettings
  wordMemory?: WordMemory[]
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

type SpellStatus = 'playing' | 'departing' | 'paused' | 'won' | 'ended'

export function createSpellRunWords(
  levelId: VocabularyLevelId,
  wordMemory: WordMemory[],
  random = Math.random,
): WordEntry[] {
  const level = getVocabularyLevel(levelId)
  return createWordSession(level.words, wordMemory, {
    length: SPELL_RUN_WORD_COUNT,
    random,
  })
}

export function SpellGamePage({
  audioSettings,
  wordMemory = [],
  navigate,
  toggleAudio,
  onRunSaved,
}: SpellGamePageProps) {
  const [selectedLevel, setSelectedLevel] = useState<VocabularyLevelId>(DEFAULT_VOCABULARY_LEVEL)
  const [sessionWords, setSessionWords] = useState(() => createSpellRunWords(DEFAULT_VOCABULARY_LEVEL, wordMemory))
  const [wordIndex, setWordIndex] = useState(0)
  const [stageLevel, setStageLevel] = useState<1 | 2 | 3 | 4>(1)
  const [correctWords, setCorrectWords] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [mistakeStreak, setMistakeStreak] = useState(0)
  const [rescueHints, setRescueHints] = useState(0)
  const [status, setStatus] = useState<SpellStatus>('playing')
  const [runStarted, setRunStarted] = useState(false)
  const [message, setMessage] = useState('看中文和乱序字母，用实体键盘拼出完整英文')
  const [stageNotice, setStageNotice] = useState<string | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const [finalDurationMs, setFinalDurationMs] = useState<number | null>(null)
  const [finalBreakdown, setFinalBreakdown] = useState<RunRewardBreakdown | null>(null)
  const [mistakePulse, setMistakePulse] = useState(0)

  const currentWord = sessionWords[wordIndex] ?? sessionWords[0]
  const [letterOrder, setLetterOrder] = useState(() => createSpellLetterOrder(currentWord.text))
  const typing = useTypingSession(currentWord.text, status === 'playing')
  const hint = useMemo(
    () => buildSpellHint(letterOrder, stageLevel, mistakeStreak),
    [letterOrder, mistakeStreak, stageLevel],
  )
  const stageRules = getSpellStageRules(stageLevel)
  const selectedLevelDefinition = getVocabularyLevel(selectedLevel)
  const wordMemoryKey = wordMemory
    .map((word) => `${word.wordId}:${word.lastPracticedAt}:${word.needsReview}`)
    .join('|')

  const runClockRef = useRef(new ActiveRunClock())
  const mountedRef = useRef(true)
  const savedRef = useRef(false)
  const statusRef = useRef<SpellStatus>('playing')
  const selectedLevelRef = useRef<VocabularyLevelId>(DEFAULT_VOCABULARY_LEVEL)
  const highestStageRef = useRef(1)
  const correctWordsRef = useRef(0)
  const correctCharactersRef = useRef(0)
  const mistakesRef = useRef(0)
  const streakRef = useRef(0)
  const maxStreakRef = useRef(0)
  const mistakeStreakRef = useRef(0)
  const rescueHintsRef = useRef(0)
  const currentWordHadRescueRef = useRef(false)
  const activeWordIdRef = useRef(currentWord.id)
  const completedWordsRef = useRef<string[]>([])
  const completedWordIdsRef = useRef<string[]>([])
  const mistakeWordIdsRef = useRef<string[]>([])
  const processedSequenceRef = useRef(0)
  const transitionTimerRef = useRef<number | null>(null)
  const pausedByVisibilityRef = useRef(false)

  const setGameStatus = useCallback((nextStatus: SpellStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  const createQueue = useCallback(
    (levelId: VocabularyLevelId) => createSpellRunWords(levelId, wordMemory),
    [wordMemoryKey],
  )

  const saveRun = useCallback(async (completed: boolean, finalStage: number) => {
    if (savedRef.current || !runClockRef.current.hasStarted) return
    savedRef.current = true

    if (
      !completed
      && activeWordIdRef.current
      && !completedWordIdsRef.current.includes(activeWordIdRef.current)
      && !mistakeWordIdsRef.current.includes(activeWordIdRef.current)
    ) {
      mistakeWordIdsRef.current.push(activeWordIdRef.current)
    }

    const timing = runClockRef.current.finish()
    const highestStage = Math.max(1, Math.min(SPELL_FINAL_STAGE, finalStage))
    const run: RunResult = {
      id: createRunId('spell'),
      gameId: 'spell',
      mode: 'recall',
      wordPackId: getVocabularyLevel(selectedLevelRef.current).wordPackId,
      difficulty: highestStage,
      speedTier: 1,
      rulesVersion: SPELL_RULES_VERSION,
      challengeMode: 'learning',
      startStage: 1,
      highestStage,
      startedAt: timing.startedAt,
      completedAt: timing.completedAt,
      durationMs: timing.durationMs,
      pausedMs: timing.pausedMs,
      completed,
      correctWords: correctWordsRef.current,
      correctCharacters: correctCharactersRef.current,
      mistakes: mistakesRef.current,
      failures: 0,
      maxStreak: maxStreakRef.current,
      score: correctWordsRef.current * 140
        + maxStreakRef.current * 35
        + Math.max(0, highestStage - 1) * 240,
      words: [...completedWordsRef.current],
      wordIds: [...completedWordIdsRef.current],
      mistakeWordIds: [...mistakeWordIdsRef.current],
      rescueHints: rescueHintsRef.current,
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
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
      if (runClockRef.current.hasStarted && !savedRef.current) {
        void saveRun(false, highestStageRef.current)
      }
    }
  }, [saveRun])

  useEffect(() => {
    if (runClockRef.current.hasStarted || statusRef.current !== 'playing') return
    const nextWords = createQueue(selectedLevelRef.current)
    setSessionWords(nextWords)
    setWordIndex(0)
    activeWordIdRef.current = nextWords[0].id
    setLetterOrder(createSpellLetterOrder(nextWords[0].text))
    typing.reset(nextWords[0].text)
  }, [createQueue])

  useEffect(() => {
    const event = typing.lastEvent
    if (!event || event.sequence === processedSequenceRef.current) return
    processedSequenceRef.current = event.sequence

    if (!runClockRef.current.hasStarted) {
      runClockRef.current.start()
      setRunStarted(true)
    }

    const nextMistakeStreak = nextSpellMistakeStreak(mistakeStreakRef.current, event.type)
    mistakeStreakRef.current = nextMistakeStreak
    setMistakeStreak(nextMistakeStreak)

    if (event.type === 'correct' || event.type === 'complete') {
      correctCharactersRef.current += 1
    }

    if (event.type === 'correct') {
      setMessage(`${event.snapshot.typed} 已装车，继续输入下一节车厢`)
      audioService.play('typing.correct')
      return
    }

    if (event.type === 'backspace') {
      setMessage('已退回一节空车厢，可以重新输入')
      return
    }

    if (event.type === 'mistake') {
      mistakesRef.current += 1
      streakRef.current = 0
      mistakeWordIdsRef.current.push(currentWord.id)
      setMistakes(mistakesRef.current)
      setStreak(0)
      setMistakePulse(event.sequence)
      audioService.play('typing.wrong')

      const rescue = buildSpellHint(letterOrder, stageLevel, nextMistakeStreak).rescueApplied
      if (rescue && !currentWordHadRescueRef.current) {
        currentWordHadRescueRef.current = true
        rescueHintsRef.current += 1
        setRescueHints(rescueHintsRef.current)
        setMessage('没关系，轨道旁临时多送来 1 个字母提示')
      } else {
        setMessage('这个字母还不对，正确车厢都保留着，再试一次')
      }
      return
    }

    if (event.type !== 'complete') return

    const nextCorrectWords = correctWordsRef.current + 1
    const nextStreak = streakRef.current + 1
    const nextMaxStreak = Math.max(maxStreakRef.current, nextStreak)
    const nextStage = spellStageForCompletedWords(nextCorrectWords)
    const finished = nextCorrectWords >= SPELL_RUN_WORD_COUNT

    correctWordsRef.current = nextCorrectWords
    streakRef.current = nextStreak
    maxStreakRef.current = nextMaxStreak
    completedWordsRef.current.push(currentWord.text)
    completedWordIdsRef.current.push(currentWord.id)
    setCorrectWords(nextCorrectWords)
    setStreak(nextStreak)
    setMaxStreak(nextMaxStreak)
    setMessage(`${currentWord.text} 装车完成，小火车准备发车！`)
    setGameStatus('departing')
    runClockRef.current.pause()
    audioService.play('spell.depart')
    audioService.speak(currentWord.text)
    if ([4, 8, 12].includes(nextCorrectWords)) {
      const nextRules = getSpellStageRules(nextStage)
      highestStageRef.current = Math.max(highestStageRef.current, nextStage)
      setStageNotice(`到达${nextRules.label}：下一词显示 ${Math.round(nextRules.hintRatio * 100)}% 字母提示`)
      audioService.play('level.up')
    }
    if ([4, 8, 12, 16].includes(nextStreak)) audioService.play('combo.up')

    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null
      if (finished) {
        highestStageRef.current = SPELL_FINAL_STAGE
        setStageNotice(null)
        setGameStatus('won')
        audioService.play('run.success')
        void saveRun(true, SPELL_FINAL_STAGE)
        return
      }

      const nextIndex = wordIndex + 1
      const nextWord = sessionWords[nextIndex]
      activeWordIdRef.current = nextWord.id
      currentWordHadRescueRef.current = false
      mistakeStreakRef.current = 0
      highestStageRef.current = Math.max(highestStageRef.current, nextStage)
      setWordIndex(nextIndex)
      setStageLevel(nextStage)
      setMistakeStreak(0)
      setLetterOrder(createSpellLetterOrder(nextWord.text))
      setStageNotice(null)
      setMessage(nextStage === 4
        ? '现在只看中文，想好后从第一个英文字母开始输入'
        : '新单词到站，按任意正确字母开始装车')
      typing.reset(nextWord.text)

      if (document.hidden) {
        pausedByVisibilityRef.current = true
        setGameStatus('paused')
      } else {
        runClockRef.current.resume()
        setGameStatus('playing')
      }
    }, SPELL_AUTO_ADVANCE_DELAY_MS)
  }, [currentWord, letterOrder, saveRun, sessionWords, setGameStatus, stageLevel, typing.lastEvent, wordIndex])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (statusRef.current === 'playing' && runClockRef.current.hasStarted) {
          pausedByVisibilityRef.current = true
          runClockRef.current.pause()
          setGameStatus('paused')
        } else if (statusRef.current === 'departing') {
          pausedByVisibilityRef.current = true
        }
        return
      }

      if (statusRef.current === 'paused' && pausedByVisibilityRef.current) {
        pausedByVisibilityRef.current = false
        runClockRef.current.resume()
        setGameStatus('playing')
      } else if (statusRef.current === 'departing') {
        pausedByVisibilityRef.current = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [setGameStatus])

  const changeLevel = (levelId: VocabularyLevelId) => {
    if (runClockRef.current.hasStarted) return
    const nextWords = createQueue(levelId)
    selectedLevelRef.current = levelId
    activeWordIdRef.current = nextWords[0].id
    setSelectedLevel(levelId)
    setSessionWords(nextWords)
    setWordIndex(0)
    setLetterOrder(createSpellLetterOrder(nextWords[0].text))
    setMessage('词库已更换，看中文和乱序字母开始拼写')
    typing.reset(nextWords[0].text)
  }

  const pauseRun = () => {
    if (!runStarted || statusRef.current !== 'playing') return
    pausedByVisibilityRef.current = false
    runClockRef.current.pause()
    setGameStatus('paused')
  }

  const resumeRun = () => {
    if (document.hidden) return
    pausedByVisibilityRef.current = false
    runClockRef.current.resume()
    setGameStatus('playing')
  }

  const endRun = async () => {
    if (!runClockRef.current.hasStarted || statusRef.current !== 'playing') return
    runClockRef.current.pause()
    setGameStatus('ended')
    audioService.play('run.success')
    await saveRun(false, highestStageRef.current)
  }

  const reset = () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
    const nextWords = createQueue(selectedLevelRef.current)
    runClockRef.current.reset()
    savedRef.current = false
    statusRef.current = 'playing'
    highestStageRef.current = 1
    correctWordsRef.current = 0
    correctCharactersRef.current = 0
    mistakesRef.current = 0
    streakRef.current = 0
    maxStreakRef.current = 0
    mistakeStreakRef.current = 0
    rescueHintsRef.current = 0
    currentWordHadRescueRef.current = false
    activeWordIdRef.current = nextWords[0].id
    completedWordsRef.current = []
    completedWordIdsRef.current = []
    mistakeWordIdsRef.current = []
    processedSequenceRef.current = 0
    transitionTimerRef.current = null
    pausedByVisibilityRef.current = false
    setSessionWords(nextWords)
    setWordIndex(0)
    setStageLevel(1)
    setCorrectWords(0)
    setMistakes(0)
    setStreak(0)
    setMaxStreak(0)
    setMistakeStreak(0)
    setRescueHints(0)
    setStatus('playing')
    setRunStarted(false)
    setMessage('看中文和乱序字母，用实体键盘拼出完整英文')
    setStageNotice(null)
    setStorageWarning(false)
    setFinalDurationMs(null)
    setFinalBreakdown(null)
    setMistakePulse(0)
    setLetterOrder(createSpellLetterOrder(nextWords[0].text))
    typing.reset(nextWords[0].text)
  }

  const stageProgress = status === 'departing'
    ? Math.min(SPELL_WORDS_PER_STAGE, spellWordsIntoStage(Math.max(0, correctWords - 1)) + 1)
    : spellWordsIntoStage(correctWords)
  const totalProgress = correctWords / SPELL_RUN_WORD_COUNT * 100
  const rewardDetail = finalBreakdown
    ? `获得 ${finalBreakdown.total} 冒险积分：基础 ${finalBreakdown.basePoints} + 车站 ${finalBreakdown.stageBonus} + 准确 ${finalBreakdown.accuracyBonus}。`
    : ''
  const hintLabel = hint.visibleCount === 0
    ? '本站不显示乱序字母，只看中文完成拼写'
    : `轨道旁乱序货物：${hint.visibleCount} / ${hint.totalLetters} 个字母`
  const compactCarriageWidth = Math.max(18, Math.min(30, Math.floor(
    (270 - Math.max(0, currentWord.text.length - 1) * 3) / currentWord.text.length,
  )))

  return (
    <GameShell
      title="字母小火车"
      subtitle={`${selectedLevelDefinition.shortLabel} · ${stageRules.label}`}
      audioSettings={audioSettings}
      navigate={navigate}
      toggleAudio={toggleAudio}
    >
      <main className="spell-game-layout">
        <aside className="spell-route-card" aria-label="四座拼写车站">
          <div className="spell-route-heading">
            <span aria-hidden="true">🚉</span>
            <div><small>LETTER LINE</small><h1>四座拼写车站</h1></div>
          </div>
          <p>每站完成 4 个词。升级只减少乱序字母，不增加倒计时或生命值。</p>
          <ol className="spell-station-list">
            {[1, 2, 3, 4].map((station) => {
              const rules = getSpellStageRules(station)
              return (
                <li
                  className={station < stageLevel ? 'complete' : station === stageLevel ? 'active' : ''}
                  aria-current={station === stageLevel ? 'step' : undefined}
                  key={station}
                >
                  <b>{station}</b>
                  <span><strong>{rules.label}</strong><small>{Math.round(rules.hintRatio * 100)}% 乱序字母可见</small></span>
                </li>
              )
            })}
          </ol>
          <div className="spell-route-note">
            <strong>温和救援</strong>
            <p>连续两次错键，只给当前词临时增加 1 个字母；正确车厢永远不会被清空。</p>
          </div>
          <dl className="spell-route-stats">
            <div><dt>最高连发</dt><dd>{maxStreak}</dd></div>
            <div><dt>救援提示</dt><dd>{rescueHints}</dd></div>
          </dl>
        </aside>

        <section className="spell-board-card">
          <div className="spell-level-switch" role="group" aria-label="选择字母小火车词库等级">
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
            <button className="spell-pause-button" disabled={!runStarted || status !== 'playing'} onClick={pauseRun}>暂停</button>
            <button className="end-run-button" disabled={!runStarted || status !== 'playing'} onClick={() => void endRun()}>结束并结算</button>
          </div>

          <div className="spell-hud">
            <span>第 <b>{stageLevel}</b> / {SPELL_FINAL_STAGE} 站</span>
            <span>本站 <b>{stageProgress}</b> / {SPELL_WORDS_PER_STAGE} 词</span>
            <span>全程 <b>{correctWords}</b> / {SPELL_RUN_WORD_COUNT}</span>
            <span>连续发车 <b>{streak}</b></span>
            <span>错键 <b>{mistakes}</b></span>
          </div>
          <div className="spell-total-progress" aria-label={`全程已完成 ${correctWords} 个词，共 ${SPELL_RUN_WORD_COUNT} 个词`}>
            <i style={{ width: `${totalProgress}%` }} />
          </div>

          <div
            className="spell-word-stage"
            tabIndex={0}
            aria-label="字母小火车拼写区，请使用实体键盘输入"
          >
            <header className="spell-destination-sign">
              <div><small>下一站中文目的地</small><strong>{currentWord.meaning}</strong></div>
              <button onClick={() => audioService.speak(currentWord.text)} aria-label="播放当前英文单词读音"><Icon name="sound" />听发音</button>
            </header>

            <div className="spell-train-scene">
              <div
                className={`spell-train ${currentWord.text.length > 6 ? 'compact' : ''} ${status === 'departing' ? 'departing' : ''}`}
                style={{ '--spell-compact-carriage-width': `${compactCarriageWidth}px` } as CSSProperties}
              >
                <div className="spell-engine" aria-hidden="true"><span>拼</span><b>🚂</b></div>
                <div
                  className="spell-carriages"
                  aria-label={`已正确输入 ${typing.snapshot.typed.length} 个字母，共 ${currentWord.text.length} 个字母`}
                >
                  {[...currentWord.text].map((letter, index) => {
                    const filled = index < typing.snapshot.typed.length
                    const current = index === typing.snapshot.expectedIndex && status === 'playing'
                    const wrong = current && typing.lastEvent?.type === 'mistake'
                    return (
                      <span
                        className={`spell-carriage ${filled ? 'filled' : ''} ${current ? 'current' : ''} ${wrong ? 'mistake' : ''}`}
                        key={`${currentWord.id}-${index}-${wrong ? mistakePulse : 0}`}
                      >{filled ? letter : ''}</span>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="spell-hint-heading">
              <span>{hintLabel}</span>
              {hint.rescueApplied && <b>救援提示 +1</b>}
            </div>
            {hint.letters.length > 0 ? (
              <div className="spell-letter-cargo" aria-label={`乱序字母提示：${hint.letters.join('、')}`}>
                {hint.letters.map((letter, index) => <span aria-hidden="true" key={`${letter}-${index}`}>{letter}</span>)}
              </div>
            ) : (
              <div className="spell-no-hint"><strong>独立出发</strong><span>只看中文，输入完整英文</span></div>
            )}

            <p className="spell-message" role="status" aria-live="polite" aria-atomic="true">{message}</p>
            <p className="spell-keyboard-note">请直接使用实体键盘输入 · 错键不会写入答案，也不会清空正确前缀</p>

            {stageNotice && <div className="spell-stage-notice" role="status"><Icon name="star" /><span>{stageNotice}</span></div>}
          </div>
        </section>
      </main>

      {storageWarning && <p className="storage-warning" role="status">本局暂存在当前页面，请保持页面开启后再继续练习。</p>}
      {status === 'paused' && <ResultOverlay state="paused" title="小火车已停靠" detail="活跃计时和键盘输入都已暂停，可以从当前车厢继续。" onPrimary={resumeRun} primaryLabel="继续装车" onExit={() => navigate('home')} />}
      {status === 'won' && <ResultOverlay state="won" title="四座车站全部通关！" detail={`完成 ${correctWords} 个词，最高连续发车 ${maxStreak} 次，活跃 ${Math.round((finalDurationMs ?? 0) / 1000)} 秒。${rewardDetail}`} onPrimary={reset} primaryLabel="再开一趟小火车" onExit={() => navigate('home')} />}
      {status === 'ended' && <ResultOverlay state="won" title="本次小火车旅程已结算" detail={`完成 ${correctWords} 个词，到达第 ${stageLevel} 站。未完成词已加入后续复习。${rewardDetail}`} onPrimary={reset} primaryLabel="重新出发" onExit={() => navigate('home')} />}
    </GameShell>
  )
}
