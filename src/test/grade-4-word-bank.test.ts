import { describe, expect, it } from 'vitest'
import {
  ALL_VOCABULARY_WORDS,
  EXPERIENCE_WORDS,
  getVocabularyLevel,
  GRADE_4_WORDS,
  GRADE_4_WORD_PACK_ID,
  GRADE_4_WORD_PACK_NAME,
  GRADE_5_WORDS,
  GRADE_6_WORDS,
  JUNIOR_PREP_WORDS,
  VOCABULARY_LEVELS,
  WORD_SESSION_BATCH_SIZE,
} from '../core/models'

describe('FLTRP-aligned progressive word bank', () => {
  it('contains 400 words across four independently versioned levels', () => {
    expect(GRADE_4_WORD_PACK_ID).toBe('fltrp-grade4-v1')
    expect(GRADE_4_WORD_PACK_NAME).toBe('外研版四年级扩展词库')
    expect(GRADE_4_WORDS).toHaveLength(160)
    expect(GRADE_5_WORDS).toHaveLength(80)
    expect(GRADE_6_WORDS).toHaveLength(80)
    expect(JUNIOR_PREP_WORDS).toHaveLength(80)
    expect(ALL_VOCABULARY_WORDS).toHaveLength(400)
    expect(VOCABULARY_LEVELS.map((level) => level.wordPackId)).toEqual([
      'fltrp-grade4-v1',
      'fltrp-grade5-v1',
      'fltrp-grade6-v1',
      'fltrp-junior-v1',
    ])
    expect(EXPERIENCE_WORDS).toBe(GRADE_4_WORDS)
    expect(WORD_SESSION_BATCH_SIZE).toBe(24)
  })

  it('uses unique stable IDs and English spellings across every level', () => {
    expect(new Set(ALL_VOCABULARY_WORDS.map((word) => word.id)).size).toBe(ALL_VOCABULARY_WORDS.length)
    expect(new Set(ALL_VOCABULARY_WORDS.map((word) => word.text)).size).toBe(ALL_VOCABULARY_WORDS.length)
    expect(ALL_VOCABULARY_WORDS.every((word) => /^[a-z]+$/.test(word.text))).toBe(true)
    for (const level of VOCABULARY_LEVELS) {
      expect(new Set(level.words.map((word) => word.meaning)).size).toBe(level.words.length)
    }
  })

  it('preserves the original experience words and order for stored progress compatibility', () => {
    expect(GRADE_4_WORDS.slice(0, 12).map((word) => word.id)).toEqual([
      'exp-cat',
      'exp-book',
      'exp-green',
      'exp-frog',
      'exp-river',
      'exp-jump',
      'exp-school',
      'exp-friend',
      'exp-yellow',
      'exp-window',
      'exp-teacher',
      'exp-morning',
    ])
    expect(GRADE_4_WORDS.find((word) => word.text === 'teacher')).toMatchObject({
      id: 'exp-teacher',
      meaning: '老师',
    })
  })

  it('covers all difficulty tiers and exposes the requested level choices', () => {
    expect(new Set(GRADE_4_WORDS.map((word) => word.unit)).size).toBe(8)
    expect([...new Set(ALL_VOCABULARY_WORDS.map((word) => word.difficulty))].sort()).toEqual([1, 2, 3, 4, 5])
    expect(VOCABULARY_LEVELS.map((level) => level.shortLabel)).toEqual([
      '四年级基础',
      '五年级进阶',
      '六年级挑战',
      '未来初中',
    ])
    expect(getVocabularyLevel('junior').words).toBe(JUNIOR_PREP_WORDS)
    expect(ALL_VOCABULARY_WORDS.every((word) => word.tags.includes('fltrp-aligned'))).toBe(true)
  })
})
