import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = resolve(process.cwd(), 'src')
const gamePages = [
  'pages/TrainingPage.tsx',
  'pages/FrogGamePage.tsx',
  'pages/ChaseGamePage.tsx',
] as const
const vocabularyGamePages = [
  'pages/FrogGamePage.tsx',
  'pages/ChaseGamePage.tsx',
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

  it.each(gamePages)('%s consumes every required shared game service', (page) => {
    const source = readSource(page)

    expect(source).toContain("from '../core/use-typing-session'")
    expect(source).toMatch(/useTypingSession\(/)
    expect(source).toContain("from '../core/progress-store'")
    expect(source).toMatch(/progressStore\.saveRun\(/)
    expect(source).toContain("from '../core/audio-service'")
    expect(source).toMatch(/audioService\.(?:play|speak)\(/)
    expect(source).toContain("rulesVersion: '1.2.0'")
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
