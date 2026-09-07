import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioService } from '../core/audio-service'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('AudioService', () => {
  it('toggles mute without requiring an AudioContext', () => {
    const service = new AudioService()
    const initial = service.getSettings().muted
    expect(service.toggleMuted().muted).toBe(!initial)
  })

  it('clamps channel volume to the supported range', () => {
    const service = new AudioService()
    expect(service.setChannel('music', 2).music).toBe(1)
    expect(service.setChannel('music', -1).music).toBe(0)
  })

  it('treats blocked or unavailable audio as optional', async () => {
    const service = new AudioService()
    await expect(service.unlock()).resolves.toBeUndefined()
    expect(() => service.play('run.failure')).not.toThrow()
    expect(() => service.play('spell.depart')).not.toThrow()
  })

  it('pauses registered music while hidden and resumes when visible', () => {
    const service = new AudioService()
    const output = { setVolume: vi.fn(), pause: vi.fn(), resume: vi.fn() }
    service.registerMusicOutput(output)

    service.setPageHidden(true)
    expect(output.pause).toHaveBeenCalled()
    service.setPageHidden(false)
    expect(output.resume).toHaveBeenCalled()
  })

  it('ducks registered music to half volume while pronunciation plays', () => {
    let spokenUtterance: {
      onstart: null | (() => void)
      onend: null | (() => void)
    } | null = null
    class MockUtterance {
      lang = ''
      rate = 1
      volume = 1
      onstart: null | (() => void) = null
      onend: null | (() => void) = null
      onerror: null | (() => void) = null
      constructor(public readonly text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)
    vi.stubGlobal('speechSynthesis', {
      cancel: vi.fn(),
      speak: vi.fn((utterance: typeof spokenUtterance) => { spokenUtterance = utterance }),
    })

    const service = new AudioService()
    service.setChannel('music', 0.4)
    const output = { setVolume: vi.fn(), pause: vi.fn(), resume: vi.fn() }
    service.registerMusicOutput(output)
    service.speak('cat')

    expect(spokenUtterance).not.toBeNull()
    spokenUtterance!.onstart?.()
    expect(output.setVolume).toHaveBeenLastCalledWith(0.2)
    spokenUtterance!.onend?.()
    expect(output.setVolume).toHaveBeenLastCalledWith(0.4)
  })

  it('persists settings and stops synchronizing an unregistered output', () => {
    const service = new AudioService()
    const output = { setVolume: vi.fn(), pause: vi.fn(), resume: vi.fn() }
    const unregister = service.registerMusicOutput(output)
    service.setChannel('music', 0.6)
    expect(new AudioService().getSettings().music).toBe(0.6)

    unregister()
    const callsBeforeMute = output.setVolume.mock.calls.length
    service.toggleMuted()
    expect(output.setVolume).toHaveBeenCalledTimes(callsBeforeMute)
  })
})
