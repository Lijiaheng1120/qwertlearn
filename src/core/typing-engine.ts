export type TypingStatus = 'idle' | 'typing' | 'complete'
export type TypingEventType = 'ignored' | 'correct' | 'mistake' | 'backspace' | 'complete'

export interface TypingSnapshot {
  word: string
  typed: string
  expectedIndex: number
  errors: number
  correctKeystrokes: number
  totalKeystrokes: number
  status: TypingStatus
  accuracy: number
  wpm: number
}

export interface TypingInputEvent {
  type: TypingEventType
  snapshot: TypingSnapshot
  expected?: string
  received?: string
}

export class TypingEngine {
  private word: string
  private typed = ''
  private errors = 0
  private correctKeystrokes = 0
  private totalKeystrokes = 0
  private startedAt: number | null = null
  private completedAt: number | null = null

  constructor(word: string) {
    this.word = TypingEngine.normalizeWord(word)
  }

  static normalizeWord(word: string): string {
    return word.trim().toLocaleLowerCase('en-US')
  }

  reset(word = this.word): TypingSnapshot {
    this.word = TypingEngine.normalizeWord(word)
    this.typed = ''
    this.errors = 0
    this.correctKeystrokes = 0
    this.totalKeystrokes = 0
    this.startedAt = null
    this.completedAt = null
    return this.snapshot()
  }

  input(key: string, now = performance.now()): TypingInputEvent {
    if (this.completedAt !== null) {
      return { type: 'ignored', snapshot: this.snapshot(now) }
    }

    if (key === 'Backspace') {
      if (this.typed.length === 0) {
        return { type: 'ignored', snapshot: this.snapshot(now) }
      }
      this.typed = this.typed.slice(0, -1)
      return { type: 'backspace', snapshot: this.snapshot(now) }
    }

    if (key.length !== 1) {
      return { type: 'ignored', snapshot: this.snapshot(now) }
    }

    const received = key.toLocaleLowerCase('en-US')
    const expected = this.word[this.typed.length]
    if (expected === undefined) {
      return { type: 'ignored', snapshot: this.snapshot(now) }
    }

    this.startedAt ??= now
    this.totalKeystrokes += 1

    if (received !== expected) {
      this.errors += 1
      return {
        type: 'mistake',
        expected,
        received,
        snapshot: this.snapshot(now),
      }
    }

    this.typed += received
    this.correctKeystrokes += 1

    if (this.typed === this.word) {
      this.completedAt = now
      return {
        type: 'complete',
        expected,
        received,
        snapshot: this.snapshot(now),
      }
    }

    return {
      type: 'correct',
      expected,
      received,
      snapshot: this.snapshot(now),
    }
  }

  snapshot(now = performance.now()): TypingSnapshot {
    const elapsedMs = this.startedAt === null
      ? 0
      : Math.max(1, (this.completedAt ?? now) - this.startedAt)
    const elapsedMinutes = elapsedMs / 60_000
    const wpm = elapsedMinutes > 0
      ? Math.round((this.correctKeystrokes / 5) / elapsedMinutes)
      : 0

    return {
      word: this.word,
      typed: this.typed,
      expectedIndex: this.typed.length,
      errors: this.errors,
      correctKeystrokes: this.correctKeystrokes,
      totalKeystrokes: this.totalKeystrokes,
      status: this.completedAt !== null ? 'complete' : this.startedAt !== null ? 'typing' : 'idle',
      accuracy: this.totalKeystrokes === 0 ? 1 : this.correctKeystrokes / this.totalKeystrokes,
      wpm,
    }
  }
}
