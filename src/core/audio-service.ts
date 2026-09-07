export type AudioChannel = 'music' | 'sfx' | 'voice' | 'ui'
export type AudioEventId =
  | 'typing.correct'
  | 'typing.wrong'
  | 'frog.jump'
  | 'frog.rescue'
  | 'chase.step'
  | 'chase.catch'
  | 'match.correct'
  | 'match.wrong'
  | 'match.clear'
  | 'spell.depart'
  | 'run.success'
  | 'run.failure'
  | 'level.up'
  | 'combo.up'
  | 'ui.click'

export interface AudioSettings {
  muted: boolean
  music: number
  sfx: number
  voice: number
  ui: number
}

export interface MusicOutput {
  setVolume: (volume: number) => void
  pause: () => void
  resume: () => void
}

const STORAGE_KEY = 'qwertlearn.audio.v1'
const DEFAULT_SETTINGS: AudioSettings = {
  muted: false,
  music: 0.35,
  sfx: 0.7,
  voice: 1,
  ui: 0.5,
}

const EVENT_TONES: Record<AudioEventId, { channel: AudioChannel; frequency: number; duration: number }> = {
  'typing.correct': { channel: 'sfx', frequency: 660, duration: 0.035 },
  'typing.wrong': { channel: 'sfx', frequency: 190, duration: 0.09 },
  'frog.jump': { channel: 'sfx', frequency: 440, duration: 0.12 },
  'frog.rescue': { channel: 'sfx', frequency: 260, duration: 0.18 },
  'chase.step': { channel: 'sfx', frequency: 520, duration: 0.08 },
  'chase.catch': { channel: 'sfx', frequency: 780, duration: 0.22 },
  'match.correct': { channel: 'sfx', frequency: 700, duration: 0.08 },
  'match.wrong': { channel: 'sfx', frequency: 220, duration: 0.1 },
  'match.clear': { channel: 'sfx', frequency: 820, duration: 0.2 },
  'spell.depart': { channel: 'sfx', frequency: 560, duration: 0.16 },
  'run.success': { channel: 'sfx', frequency: 720, duration: 0.25 },
  'run.failure': { channel: 'sfx', frequency: 250, duration: 0.2 },
  'level.up': { channel: 'sfx', frequency: 860, duration: 0.18 },
  'combo.up': { channel: 'sfx', frequency: 940, duration: 0.14 },
  'ui.click': { channel: 'ui', frequency: 480, duration: 0.045 },
}

function loadSettings(): AudioSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) as Partial<AudioSettings> } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export class AudioService {
  private context: AudioContext | null = null
  private settings = loadSettings()
  private listeners = new Set<(settings: AudioSettings) => void>()
  private musicOutputs = new Set<MusicOutput>()
  private pageHidden = false
  private voiceDucked = false

  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  subscribe(listener: (settings: AudioSettings) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  registerMusicOutput(output: MusicOutput): () => void {
    this.musicOutputs.add(output)
    this.syncMusicOutput(output)
    return () => this.musicOutputs.delete(output)
  }

  setPageHidden(hidden: boolean): void {
    this.pageHidden = hidden
    this.syncMusicOutputs()
  }

  async unlock(): Promise<void> {
    if (typeof window === 'undefined') return
    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) return
    try {
      this.context ??= new AudioContextConstructor()
      if (this.context.state === 'suspended') await this.context.resume()
    } catch {
      // Browsers may refuse AudioContext.resume() without a fresh user gesture.
    }
  }

  toggleMuted(): AudioSettings {
    this.settings = { ...this.settings, muted: !this.settings.muted }
    this.persist()
    this.syncMusicOutputs()
    return this.getSettings()
  }

  setChannel(channel: AudioChannel, volume: number): AudioSettings {
    this.settings = { ...this.settings, [channel]: Math.min(1, Math.max(0, volume)) }
    this.persist()
    if (channel === 'music') this.syncMusicOutputs()
    return this.getSettings()
  }

  play(eventId: AudioEventId): void {
    if (this.settings.muted) return
    const tone = EVENT_TONES[eventId]
    void this.unlock().then(() => {
      if (!this.context || this.context.state !== 'running') return
      this.emitTone(tone.frequency, tone.duration, this.settings[tone.channel])
      if (eventId === 'run.success' || eventId === 'chase.catch') {
        window.setTimeout(() => this.emitTone(tone.frequency * 1.25, tone.duration, this.settings[tone.channel]), 110)
      }
    }).catch(() => {
      // Sound is optional; visual feedback remains available when audio is blocked.
    })
  }

  speak(word: string): void {
    if (this.settings.muted || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.82
    utterance.volume = this.settings.voice

    let released = false
    const releaseDuck = () => {
      if (released) return
      released = true
      this.voiceDucked = false
      this.syncMusicOutputs()
    }
    utterance.onstart = () => {
      this.voiceDucked = true
      this.syncMusicOutputs()
    }
    utterance.onend = releaseDuck
    utterance.onerror = releaseDuck

    try {
      speechSynthesis.speak(utterance)
    } catch {
      releaseDuck()
    }
  }

  private syncMusicOutputs(): void {
    this.musicOutputs.forEach((output) => this.syncMusicOutput(output))
  }

  private syncMusicOutput(output: MusicOutput): void {
    const volume = this.settings.muted ? 0 : this.settings.music * (this.voiceDucked ? 0.5 : 1)
    output.setVolume(volume)
    if (this.pageHidden || this.settings.muted) output.pause()
    else output.resume()
  }

  private emitTone(frequency: number, duration: number, volume: number): void {
    if (!this.context || volume <= 0) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const now = this.context.currentTime

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.08), now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    } catch {
      // Audio settings remain available for the current session when storage is unavailable.
    }
    this.listeners.forEach((listener) => listener(this.getSettings()))
  }
}

export const audioService = new AudioService()
