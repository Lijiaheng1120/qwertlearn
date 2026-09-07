import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = resolve(process.cwd(), 'src')
const keyboardGamePages = [
  'pages/TrainingPage.tsx',
  'pages/FrogGamePage.tsx',
  'pages/ChaseGamePage.tsx',
  'pages/SpellGamePage.tsx',
] as const
const gamePages = [...keyboardGamePages, 'pages/MatchGamePage.tsx'] as const
const vocabularyGamePages = [
  'pages/FrogGamePage.tsx',
  'pages/ChaseGamePage.tsx',
  'pages/MatchGamePage.tsx',
  'pages/SpellGamePage.tsx',
] as const

function readSource(relativePath: string): string {
  return readFileSync(resolve(sourceRoot, relativePath), 'utf8')
}

function productionTypeScriptFiles(directory = sourceRoot): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return entry.name === 'test' ? [] : productionTypeScriptFiles(path)
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : []
  })
}

describe('production architecture contracts', () => {
  it('keeps the sole raw keydown listener inside useTypingSession', () => {
    const owners = productionTypeScriptFiles()
      .filter((path) => /addEventListener\(\s*['"]keydown['"]/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(sourceRoot, path))
      .sort()

    expect(owners).toEqual(['core/use-typing-session.ts'])
  })

  it('keeps the word book on shared summary memory and shared game selection', () => {
    const source = readSource('pages/WordBookPage.tsx')

    expect(source).toContain('summary.wordMemory')
    expect(source).toContain("navigate('frog')")
    expect(source).not.toMatch(/progressStore|indexedDB|localStorage|EXPERIENCE_WORDS|createWordSession/)
  })

  it('keeps reward settlement and redemption behind ProgressStore', () => {
    const importers = productionTypeScriptFiles()
      .filter((path) => /from ['"](?:\.\/|\.\.\/core\/)reward-system['"]/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(sourceRoot, path))
      .sort()

    expect(importers).toEqual(['core/progress-store.ts'])
    const progressStore = readSource('core/progress-store.ts')
    expect(progressStore).toContain('settleRunReward')
    expect(progressStore).toContain('redeemCosmeticReward')
    expect(progressStore).toContain('requestFamilyRewardState')
    expect(progressStore).toContain('requestCashRewardState')
  })

  it.each(keyboardGamePages)('%s consumes the shared Typing Session and game services', (page) => {
    const source = readSource(page)

    expect(source).toContain("from '../core/use-typing-session'")
    expect(source).toMatch(/useTypingSession\(/)
    expect(source).toContain("from '../core/progress-store'")
    expect(source).toMatch(/progressStore\.saveRun\(/)
    expect(source).toContain("from '../core/audio-service'")
    expect(source).toMatch(/audioService\.(?:play|speak)\(/)
    expect(source).toMatch(/rulesVersion: (?:'1\.2\.0'|FROG_RULES_VERSION|CHASE_RULES_VERSION|SPELL_RULES_VERSION)/)
  })

  it('keeps Letter Train hints, timing, and visual carriages behind shared engines', () => {
    const source = readSource('pages/SpellGamePage.tsx')

    expect(source).toContain("from '../core/spell-engine'")
    expect(source).toMatch(/createSpellLetterOrder\(/)
    expect(source).toMatch(/buildSpellHint\(/)
    expect(source).toMatch(/nextSpellMistakeStreak\(/)
    expect(source).toContain("from '../core/run-clock'")
    expect(source).toMatch(/new ActiveRunClock\(\)/)
    expect(source).toContain('SPELL_AUTO_ADVANCE_DELAY_MS')
    expect(source.indexOf('className="spell-carriages"')).toBeLessThan(source.indexOf('className="spell-engine"'))
    const styles = readSource('styles.css')
    expect(styles).toContain('@keyframes spell-train-depart { 35% { transform: translateX(12px); } 100% { transform: translateX(115%); } }')
    expect(styles).toContain('@keyframes spell-train-depart-mobile { 35% { transform: scale(.84) translateX(12px); } 100% { transform: scale(.84) translateX(130%); } }')
    expect(styles).not.toMatch(/@keyframes spell-train-depart[^\n]*translateX\(-/)
  })

  it('keeps the frog attached to the shared moving-pad motion helper', () => {
    const source = readSource('games/frog/FrogScene.ts')

    expect(source).toContain("from './frog-pad-motion'")
    expect(source).toContain('getFrogPadRiderPosition(landedPad.shape)')
    expect(source).toContain('getFrogJumpPosition(')
    expect(source).toContain('getNextFrogRouteStep(targetIndex, this.stageRules.lilyRows)')
    expect(source).toContain('this.returnToShore(nextWord, settle)')
    expect(source).toMatch(/update\(\): void \{\s*this\.followLandedPad\(\)/)
  })

  it('keeps the pointer-driven match game on the shared Match Session boundary', () => {
    const source = readSource('pages/MatchGamePage.tsx')
    expect(source).toContain("from '../core/use-match-session'")
    expect(source).toMatch(/useMatchSession\(/)
    expect(source).toContain("from '../core/progress-store'")
    expect(source).toMatch(/progressStore\.saveRun\(/)
    expect(source).toContain("from '../core/audio-service'")
    expect(source).toMatch(/audioService\.(?:play|speak)\(/)
    expect(source).toContain('getMatchEndlessRoundRules')
    expect(source).toContain("MATCH_ENDLESS_RULES_VERSION : MATCH_RULES_VERSION")
  })

  it.each(vocabularyGamePages)('%s uses the shared randomized word session', (page) => {
    const source = readSource(page)
    expect(source).toContain("from '../core/word-session'")
    expect(source).toMatch(/createWordSession\(/)
  })

  it.each(gamePages)('%s does not bypass shared persistence or audio services', (page) => {
    const source = readSource(page)

    expect(source).not.toMatch(/\bindexedDB\b|\bopenDB\s*\(|\blocalStorage\b/)
    expect(source).not.toMatch(/\bAudioContext\b|\bwebkitAudioContext\b|\bspeechSynthesis\b/)
    expect(source).not.toMatch(/addEventListener\(\s*['"]keydown['"]/)
  })
})
