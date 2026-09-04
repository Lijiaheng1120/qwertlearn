import { describe, expect, it } from 'vitest'
import {
  FROG_RIDER_Y_OFFSET,
  getFrogJumpPosition,
  getFrogPadRiderPosition,
  getFrogReturnPosition,
  getNextFrogRouteStep,
} from '../games/frog/frog-pad-motion'

describe('frog moving-pad motion', () => {
  it('keeps the rider centered above the pad as its coordinates change', () => {
    expect(FROG_RIDER_Y_OFFSET).toBe(38)
    expect(getFrogPadRiderPosition({ x: 320, y: 260 })).toEqual({ x: 320, y: 222 })
    expect(getFrogPadRiderPosition({ x: 390, y: 300 })).toEqual({ x: 390, y: 262 })
  })

  it('returns from the top to the shore with a visible interpolated path', () => {
    const start = { x: 820, y: 117 }
    const shore = { x: 78, y: 482 }

    expect(getFrogReturnPosition(start, shore, 0)).toEqual(start)
    expect(getFrogReturnPosition(start, shore, 0.5)).toEqual({ x: 449, y: 299.5 })
    expect(getFrogReturnPosition(start, shore, 1)).toEqual(shore)
  })

  it('only advances bottom-to-top and resets to the bottom after the highest pad', () => {
    expect(getNextFrogRouteStep(0, 4)).toEqual({ reachedTop: false, nextTargetIndex: 1 })
    expect(getNextFrogRouteStep(1, 4)).toEqual({ reachedTop: false, nextTargetIndex: 2 })
    expect(getNextFrogRouteStep(2, 4)).toEqual({ reachedTop: false, nextTargetIndex: 3 })
    expect(getNextFrogRouteStep(3, 4)).toEqual({ reachedTop: true, nextTargetIndex: 0 })
    expect(getNextFrogRouteStep(0, 1)).toEqual({ reachedTop: true, nextTargetIndex: 0 })
  })

  it('aims each jump at the pad live position and adds a smooth arc', () => {
    const start = { x: 0, y: 0 }
    const pad = { x: 100, y: 138 }

    expect(getFrogJumpPosition(start, pad, 0)).toEqual(start)
    expect(getFrogJumpPosition(start, pad, 0.5)).toEqual({ x: 50, y: -12 })
    const landing = getFrogJumpPosition(start, pad, 1)
    expect(landing.x).toBe(100)
    expect(landing.y).toBeCloseTo(100)
    expect(getFrogJumpPosition(start, { x: 160, y: 178 }, 1, 0)).toEqual({ x: 160, y: 140 })
  })
})
