import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const rasterIcons = [
  ['public/qwertlearn-icon-192.png', 192, 192],
  ['public/qwertlearn-icon-512.png', 512, 512],
  ['public/qwertlearn-icon-maskable-512.png', 512, 512],
  ['public/apple-touch-icon.png', 180, 180],
] as const

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8')
}

function readPngDimensions(relativePath: string): { width: number; height: number } {
  const bytes = readFileSync(resolve(projectRoot, relativePath))
  expect(Array.from(bytes.subarray(0, 8))).toEqual(pngSignature)
  expect(bytes.toString('ascii', 12, 16)).toBe('IHDR')
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

describe('PWA assets and metadata', () => {
  it.each(rasterIcons)('%s is a valid %sx%s PNG', (path, width, height) => {
    expect(readPngDimensions(path)).toEqual({ width, height })
  })

  it('declares install icons, maskable purpose, and offline PNG precaching', () => {
    const config = readProjectFile('vite.config.ts')

    for (const icon of [
      'qwertlearn-icon-192.png',
      'qwertlearn-icon-512.png',
      'qwertlearn-icon-maskable-512.png',
      'apple-touch-icon.png',
    ]) {
      expect(config).toContain(`'${icon}'`)
    }
    expect(config).toContain("purpose: 'maskable'")
    expect(config).toContain("display: 'standalone'")
    expect(config).toContain("globPatterns: ['**/*.{js,css,html,svg,png,woff2}']")
  })

  it('links the Apple Touch icon and records generated icon provenance', () => {
    const html = readProjectFile('index.html')
    const credits = readProjectFile('ASSET_CREDITS.md')

    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />')
    for (const icon of [
      'qwertlearn-icon-192.png',
      'qwertlearn-icon-512.png',
      'qwertlearn-icon-maskable-512.png',
      'apple-touch-icon.png',
    ]) {
      expect(credits).toContain(`public/${icon}`)
    }
    expect(credits).toContain('macOS `sips` 本地生成')
    expect(credits).toContain('未引入外部素材')
  })
})
