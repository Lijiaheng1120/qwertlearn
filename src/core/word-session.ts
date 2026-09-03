import type { RunResult, WordEntry, WordMemory } from './models'

export interface WordSessionOptions {
  length: number
  random?: () => number
}

interface MutableWordMemory {
  completedCount: number
  mistakeCount: number
  cleanStreak: number
  lastPracticedAt: number
  lastMistakeAt: number | null
}

function occurrenceCount(values: string[], target: string): number {
  return values.reduce((count, value) => count + (value === target ? 1 : 0), 0)
}

export function buildWordMemory(runs: RunResult[], wordBank: WordEntry[]): WordMemory[] {
  const wordsById = new Map(wordBank.map((word) => [word.id, word]))
  const idsByText = new Map(wordBank.map((word) => [word.text.toLowerCase(), word.id]))
  const memory = new Map<string, MutableWordMemory>()

  for (const run of [...runs].sort((left, right) => left.completedAt - right.completedAt)) {
    const completedIds = run.wordIds?.length
      ? run.wordIds
      : run.words.map((text) => idsByText.get(text.toLowerCase())).filter((id): id is string => Boolean(id))
    const mistakeIds = run.mistakeWordIds ?? []
    const touchedIds = new Set([...completedIds, ...mistakeIds])

    for (const wordId of touchedIds) {
      if (!wordsById.has(wordId)) continue
      const completedThisRun = occurrenceCount(completedIds, wordId)
      const mistakesThisRun = occurrenceCount(mistakeIds, wordId)
      const current = memory.get(wordId) ?? {
        completedCount: 0,
        mistakeCount: 0,
        cleanStreak: 0,
        lastPracticedAt: 0,
        lastMistakeAt: null,
      }

      current.completedCount += completedThisRun
      current.mistakeCount += mistakesThisRun
      current.lastPracticedAt = Math.max(current.lastPracticedAt, run.completedAt)
      if (mistakesThisRun > 0) {
        current.cleanStreak = 0
        current.lastMistakeAt = run.completedAt
      } else if (completedThisRun > 0) {
        current.cleanStreak += completedThisRun
      }
      memory.set(wordId, current)
    }
  }

  return [...memory.entries()]
    .map(([wordId, value]) => {
      const word = wordsById.get(wordId)!
      return {
        wordId,
        text: word.text,
        meaning: word.meaning,
        ...value,
        needsReview: value.mistakeCount > 0 && value.cleanStreak < 2,
      }
    })
    .sort((left, right) => {
      if (left.needsReview !== right.needsReview) return left.needsReview ? -1 : 1
      return (right.lastMistakeAt ?? right.lastPracticedAt) - (left.lastMistakeAt ?? left.lastPracticedAt)
    })
}

function takeWeighted(
  candidates: WordEntry[],
  count: number,
  weightFor: (word: WordEntry) => number,
  random: () => number,
): WordEntry[] {
  const pool = [...candidates]
  const selected: WordEntry[] = []

  while (pool.length > 0 && selected.length < count) {
    const weights = pool.map((word) => Math.max(0.01, weightFor(word)))
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let threshold = random() * totalWeight
    let selectedIndex = pool.length - 1
    for (let index = 0; index < pool.length; index += 1) {
      if (threshold < weights[index]) {
        selectedIndex = index
        break
      }
      threshold -= weights[index]
    }
    selected.push(pool.splice(selectedIndex, 1)[0])
  }

  return selected
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function createWordSession(
  wordBank: WordEntry[],
  wordMemory: WordMemory[],
  options: WordSessionOptions,
): WordEntry[] {
  const random = options.random ?? Math.random
  const length = Math.max(1, Math.min(options.length, wordBank.length))
  const memoryById = new Map(wordMemory.map((item) => [item.wordId, item]))
  const reviewWords = wordBank.filter((word) => memoryById.get(word.id)?.needsReview)
  const regularWords = wordBank.filter((word) => !memoryById.get(word.id)?.needsReview)
  const reviewQuota = reviewWords.length === 0
    ? 0
    : Math.min(reviewWords.length, Math.max(1, Math.floor(length * 0.4)))

  const selectedReviews = takeWeighted(
    reviewWords,
    reviewQuota,
    (word) => 8 + (memoryById.get(word.id)?.mistakeCount ?? 0),
    random,
  )
  const selectedRegular = takeWeighted(
    regularWords,
    Math.min(regularWords.length, length - selectedReviews.length),
    (word) => {
      const memory = memoryById.get(word.id)
      if (!memory) return 6
      if (memory.cleanStreak >= 3) return 1
      return 2.5
    },
    random,
  )

  const selectedIds = new Set([...selectedReviews, ...selectedRegular].map((word) => word.id))
  const fallback = takeWeighted(
    wordBank.filter((word) => !selectedIds.has(word.id)),
    length - selectedIds.size,
    (word) => memoryById.get(word.id)?.needsReview ? 2 : 1,
    random,
  )
  const session = shuffle([...selectedReviews, ...selectedRegular, ...fallback], random)

  const recentMasteredIds = new Set(
    wordMemory
      .filter((item) => !item.needsReview)
      .sort((left, right) => right.lastPracticedAt - left.lastPracticedAt)
      .slice(0, 3)
      .map((item) => item.wordId),
  )
  if (recentMasteredIds.has(session[0]?.id)) {
    const replacementIndex = session.findIndex((word, index) => index > 0 && !recentMasteredIds.has(word.id))
    if (replacementIndex > 0) {
      ;[session[0], session[replacementIndex]] = [session[replacementIndex], session[0]]
    }
  }

  return session
}
