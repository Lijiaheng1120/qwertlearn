export type MatchCardSide = 'english' | 'meaning'

export interface MatchCardSelection {
  wordId: string
  side: MatchCardSide
}

export type MatchEvent =
  | { sequence: number; type: 'selected'; selection: MatchCardSelection }
  | { sequence: number; type: 'deselected'; selection: MatchCardSelection }
  | { sequence: number; type: 'matched'; first: MatchCardSelection; second: MatchCardSelection; wordId: string; streak: number }
  | { sequence: number; type: 'mismatched'; first: MatchCardSelection; second: MatchCardSelection }
  | { sequence: number; type: 'ignored'; selection: MatchCardSelection }
  | { sequence: number; type: 'reset' }

export interface MatchSnapshot {
  selected: MatchCardSelection | null
  matchedWordIds: string[]
  attempts: number
  mistakes: number
  streak: number
  maxStreak: number
  lastEvent: MatchEvent | null
}

export function createMatchSnapshot(sequence = 0): MatchSnapshot {
  return {
    selected: null,
    matchedWordIds: [],
    attempts: 0,
    mistakes: 0,
    streak: 0,
    maxStreak: 0,
    lastEvent: sequence > 0 ? { sequence, type: 'reset' } : null,
  }
}

function nextSequence(snapshot: MatchSnapshot): number {
  return (snapshot.lastEvent?.sequence ?? 0) + 1
}

function sameSelection(left: MatchCardSelection, right: MatchCardSelection): boolean {
  return left.wordId === right.wordId && left.side === right.side
}

export function selectMatchCard(snapshot: MatchSnapshot, selection: MatchCardSelection): MatchSnapshot {
  const sequence = nextSequence(snapshot)
  if (snapshot.matchedWordIds.includes(selection.wordId)) {
    return { ...snapshot, lastEvent: { sequence, type: 'ignored', selection } }
  }

  if (!snapshot.selected) {
    return {
      ...snapshot,
      selected: selection,
      lastEvent: { sequence, type: 'selected', selection },
    }
  }

  if (sameSelection(snapshot.selected, selection)) {
    return {
      ...snapshot,
      selected: null,
      lastEvent: { sequence, type: 'deselected', selection },
    }
  }

  if (snapshot.selected.side === selection.side) {
    return {
      ...snapshot,
      selected: selection,
      lastEvent: { sequence, type: 'selected', selection },
    }
  }

  const first = snapshot.selected
  if (first.wordId === selection.wordId) {
    const streak = snapshot.streak + 1
    return {
      ...snapshot,
      selected: null,
      matchedWordIds: [...snapshot.matchedWordIds, selection.wordId],
      attempts: snapshot.attempts + 1,
      streak,
      maxStreak: Math.max(snapshot.maxStreak, streak),
      lastEvent: { sequence, type: 'matched', first, second: selection, wordId: selection.wordId, streak },
    }
  }

  return {
    ...snapshot,
    selected: null,
    attempts: snapshot.attempts + 1,
    mistakes: snapshot.mistakes + 1,
    streak: 0,
    lastEvent: { sequence, type: 'mismatched', first, second: selection },
  }
}

export function resetMatchSnapshot(snapshot: MatchSnapshot): MatchSnapshot {
  return createMatchSnapshot(nextSequence(snapshot))
}
