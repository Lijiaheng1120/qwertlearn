import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AudioSettings } from '../core/audio-service'
import { GamePages } from '../pages/GamePages'

vi.mock('../pages/FrogGamePage', () => ({ FrogGamePage: () => <p>frog-component</p> }))
vi.mock('../pages/ChaseGamePage', () => ({ ChaseGamePage: () => <p>chase-component</p> }))
vi.mock('../pages/TrainingPage', () => ({ TrainingPage: () => <p>training-component</p> }))

const audioSettings: AudioSettings = { muted: false, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 }
const sharedProps = {
  audioSettings,
  wordMemory: [],
  navigate: vi.fn(),
  toggleAudio: vi.fn(),
  onRunSaved: vi.fn().mockResolvedValue(undefined),
}

describe('GamePages', () => {
  it('dispatches every supported game route to its implementation', () => {
    const view = render(<GamePages route="training" {...sharedProps} />)
    expect(screen.getByText('training-component')).toBeInTheDocument()

    view.rerender(<GamePages route="frog" {...sharedProps} />)
    expect(screen.getByText('frog-component')).toBeInTheDocument()

    view.rerender(<GamePages route="chase" {...sharedProps} />)
    expect(screen.getByText('chase-component')).toBeInTheDocument()
  })
})
