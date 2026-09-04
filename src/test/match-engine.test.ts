import { describe, expect, it } from 'vitest'
import {
  createMatchSnapshot,
  resetMatchSnapshot,
  selectMatchCard,
} from '../core/match-engine'

describe('Match Engine', () => {
  it('selects one card and replaces a selection on the same side', () => {
    const first = selectMatchCard(createMatchSnapshot(), { wordId: 'teacher', side: 'english' })
    expect(first.selected).toEqual({ wordId: 'teacher', side: 'english' })
    expect(first.lastEvent?.type).toBe('selected')

    const replaced = selectMatchCard(first, { wordId: 'school', side: 'english' })
    expect(replaced.selected).toEqual({ wordId: 'school', side: 'english' })
    expect(replaced.attempts).toBe(0)
  })

  it('deselects the same card without counting an attempt', () => {
    const selected = selectMatchCard(createMatchSnapshot(), { wordId: 'teacher', side: 'english' })
    const deselected = selectMatchCard(selected, { wordId: 'teacher', side: 'english' })
    expect(deselected.selected).toBeNull()
    expect(deselected.lastEvent?.type).toBe('deselected')
    expect(deselected.attempts).toBe(0)
  })

  it('records a mismatch, clears the selection, and resets the streak', () => {
    let snapshot = selectMatchCard(createMatchSnapshot(), { wordId: 'teacher', side: 'english' })
    snapshot = selectMatchCard(snapshot, { wordId: 'school', side: 'meaning' })
    expect(snapshot).toMatchObject({ selected: null, attempts: 1, mistakes: 1, streak: 0 })
    expect(snapshot.lastEvent).toMatchObject({
      type: 'mismatched',
      first: { wordId: 'teacher', side: 'english' },
      second: { wordId: 'school', side: 'meaning' },
    })
  })

  it('eliminates a correct pair and tracks current and maximum streaks', () => {
    let snapshot = createMatchSnapshot()
    for (const wordId of ['teacher', 'school']) {
      snapshot = selectMatchCard(snapshot, { wordId, side: 'english' })
      snapshot = selectMatchCard(snapshot, { wordId, side: 'meaning' })
    }
    expect(snapshot.matchedWordIds).toEqual(['teacher', 'school'])
    expect(snapshot).toMatchObject({ attempts: 2, mistakes: 0, streak: 2, maxStreak: 2 })
    expect(snapshot.lastEvent).toMatchObject({ type: 'matched', wordId: 'school', streak: 2 })

    const ignored = selectMatchCard(snapshot, { wordId: 'teacher', side: 'english' })
    expect(ignored.lastEvent?.type).toBe('ignored')
    expect(ignored.matchedWordIds).toEqual(snapshot.matchedWordIds)
  })

  it('resets all round state while keeping event sequences monotonic', () => {
    const selected = selectMatchCard(createMatchSnapshot(), { wordId: 'teacher', side: 'english' })
    const reset = resetMatchSnapshot(selected)
    expect(reset).toMatchObject({ selected: null, matchedWordIds: [], attempts: 0, mistakes: 0, streak: 0 })
    expect(reset.lastEvent).toMatchObject({ type: 'reset', sequence: 2 })
  })
})
