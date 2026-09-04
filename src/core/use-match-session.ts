import { useCallback, useState } from 'react'
import {
  createMatchSnapshot,
  resetMatchSnapshot,
  selectMatchCard,
  type MatchCardSelection,
  type MatchSnapshot,
} from './match-engine'

export interface MatchSession {
  snapshot: MatchSnapshot
  select: (selection: MatchCardSelection) => void
  reset: () => void
}

export function useMatchSession(): MatchSession {
  const [snapshot, setSnapshot] = useState(createMatchSnapshot)

  const select = useCallback((selection: MatchCardSelection) => {
    setSnapshot((current) => selectMatchCard(current, selection))
  }, [])

  const reset = useCallback(() => {
    setSnapshot((current) => resetMatchSnapshot(current))
  }, [])

  return { snapshot, select, reset }
}
