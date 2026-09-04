export interface MotionPoint {
  x: number
  y: number
}

export const FROG_RIDER_Y_OFFSET = 38

export function getFrogPadRiderPosition(pad: MotionPoint): MotionPoint {
  return { x: pad.x, y: pad.y - FROG_RIDER_Y_OFFSET }
}

export function getFrogJumpPosition(
  start: MotionPoint,
  pad: MotionPoint,
  progress: number,
  arcHeight = 62,
): MotionPoint {
  const target = getFrogPadRiderPosition(pad)
  return {
    x: start.x + (target.x - start.x) * progress,
    y: start.y + (target.y - start.y) * progress - Math.sin(Math.PI * progress) * arcHeight,
  }
}

export function getFrogReturnPosition(
  start: MotionPoint,
  destination: MotionPoint,
  progress: number,
): MotionPoint {
  return {
    x: start.x + (destination.x - start.x) * progress,
    y: start.y + (destination.y - start.y) * progress,
  }
}

export interface FrogRouteStep {
  reachedTop: boolean
  nextTargetIndex: number
}

export function getNextFrogRouteStep(targetIndex: number, lilyRows: number): FrogRouteStep {
  const reachedTop = targetIndex === lilyRows - 1
  return {
    reachedTop,
    nextTargetIndex: reachedTop ? 0 : targetIndex + 1,
  }
}
