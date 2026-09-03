import { describe, expect, it } from 'vitest'
import { ActiveRunClock } from '../core/run-clock'

describe('ActiveRunClock', () => {
  it('starts on the first accepted input rather than page entry', () => {
    const clock = new ActiveRunClock()
    expect(clock.elapsed(5_000)).toBe(0)

    clock.start(5_000)
    expect(clock.finish(8_500)).toEqual({
      startedAt: 5_000,
      completedAt: 8_500,
      durationMs: 3_500,
      pausedMs: 0,
    })
  })

  it('records pause time separately and excludes it from active duration', () => {
    const clock = new ActiveRunClock()
    clock.start(1_000)
    clock.pause(4_000)
    expect(clock.elapsed(14_000)).toBe(3_000)
    clock.resume(14_000)

    expect(clock.finish(18_000)).toEqual({
      startedAt: 1_000,
      completedAt: 18_000,
      durationMs: 7_000,
      pausedMs: 10_000,
    })
  })

  it('freezes the first finish result and resets cleanly', () => {
    const clock = new ActiveRunClock()
    clock.start(100)
    expect(clock.finish(500).durationMs).toBe(400)
    expect(clock.finish(2_000).durationMs).toBe(400)

    clock.reset()
    expect(clock.hasStarted).toBe(false)
    expect(clock.elapsed(3_000)).toBe(0)
  })

  it('ignores duplicate transitions and can finish while paused', () => {
    const clock = new ActiveRunClock()
    clock.start(1_000)
    clock.start(2_000)
    clock.pause(3_000)
    clock.pause(4_000)

    expect(clock.finish(8_000)).toEqual({
      startedAt: 1_000,
      completedAt: 8_000,
      durationMs: 2_000,
      pausedMs: 5_000,
    })
    clock.resume(9_000)
    expect(clock.elapsed(10_000)).toBe(2_000)
  })
})
