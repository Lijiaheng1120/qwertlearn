export interface RunTiming {
  startedAt: number
  completedAt: number
  durationMs: number
  pausedMs: number
}

export class ActiveRunClock {
  private startedAt: number | null = null
  private pausedAt: number | null = null
  private accumulatedPausedMs = 0
  private finishedTiming: RunTiming | null = null

  get hasStarted(): boolean {
    return this.startedAt !== null
  }

  start(now = Date.now()): void {
    if (this.finishedTiming || this.startedAt !== null) return
    this.startedAt = now
  }

  pause(now = Date.now()): void {
    if (this.finishedTiming || this.startedAt === null || this.pausedAt !== null) return
    this.pausedAt = now
  }

  resume(now = Date.now()): void {
    if (this.finishedTiming || this.pausedAt === null) return
    this.accumulatedPausedMs += Math.max(0, now - this.pausedAt)
    this.pausedAt = null
  }

  elapsed(now = Date.now()): number {
    if (this.finishedTiming) return this.finishedTiming.durationMs
    if (this.startedAt === null) return 0
    const currentPausedMs = this.pausedAt === null ? 0 : Math.max(0, now - this.pausedAt)
    return Math.max(0, now - this.startedAt - this.accumulatedPausedMs - currentPausedMs)
  }

  finish(now = Date.now()): RunTiming {
    if (this.finishedTiming) return { ...this.finishedTiming }

    const startedAt = this.startedAt ?? now
    const currentPausedMs = this.pausedAt === null ? 0 : Math.max(0, now - this.pausedAt)
    const pausedMs = this.accumulatedPausedMs + currentPausedMs
    this.finishedTiming = {
      startedAt,
      completedAt: now,
      durationMs: Math.max(0, now - startedAt - pausedMs),
      pausedMs,
    }
    this.pausedAt = null
    return { ...this.finishedTiming }
  }

  reset(): void {
    this.startedAt = null
    this.pausedAt = null
    this.accumulatedPausedMs = 0
    this.finishedTiming = null
  }
}
