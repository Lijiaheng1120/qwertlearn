import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { audioService } from '../core/audio-service'
import { EMPTY_DASHBOARD } from '../core/models'
import { progressStore } from '../core/progress-store'
import { App } from '../App'

vi.mock('../pages/HomePage', () => ({
  HomePage: ({ navigate, toggleAudio }: { navigate: (route: string) => void; toggleAudio: () => void }) => (
    <div>
      <p>home-page</p>
      <button onClick={() => navigate('wordbook')}>open-wordbook</button>
      <button onClick={toggleAudio}>toggle-audio</button>
    </div>
  ),
}))
vi.mock('../pages/WordBookPage', () => ({
  WordBookPage: ({ navigate }: { navigate: (route: string) => void }) => (
    <div><p>wordbook-page</p><button onClick={() => navigate('parent')}>open-parent</button></div>
  ),
}))
vi.mock('../pages/ParentDashboard', () => ({
  ParentDashboard: ({ navigate }: { navigate: (route: string) => void }) => (
    <div><p>parent-page</p><button onClick={() => navigate('home')}>open-home</button></div>
  ),
}))
vi.mock('../pages/GamePages', () => ({
  GamePages: ({ route }: { route: string }) => <p>game-page:{route}</p>,
}))

beforeEach(() => {
  window.location.hash = '#/'
  vi.spyOn(progressStore, 'getDashboardSummary').mockResolvedValue(EMPTY_DASHBOARD)
  vi.spyOn(audioService, 'play').mockImplementation(() => {})
  vi.spyOn(audioService, 'toggleMuted').mockReturnValue({ muted: true, music: 0.35, sfx: 0.7, voice: 1, ui: 0.5 })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App routing', () => {
  it('navigates through home, word book, and parent with the shared route callback', async () => {
    render(<App />)
    expect(screen.getByText('home-page')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'open-wordbook' }))
    expect(window.location.hash).toBe('#/wordbook')
    expect(screen.getByText('wordbook-page')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'open-parent' }))
    expect(window.location.hash).toBe('#/parent')
    expect(screen.getByText('parent-page')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'open-home' }))
    expect(window.location.hash).toBe('#/')
    expect(screen.getByText('home-page')).toBeInTheDocument()
    await waitFor(() => expect(progressStore.getDashboardSummary).toHaveBeenCalled())
  })

  it('reacts to external game hashes and uses the shared audio service', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'toggle-audio' }))
    expect(audioService.toggleMuted).toHaveBeenCalledOnce()

    window.location.hash = '#/frog'
    fireEvent(window, new HashChangeEvent('hashchange'))
    await waitFor(() => expect(screen.getByText('game-page:frog')).toBeInTheDocument())

    window.location.hash = '#/unknown'
    fireEvent(window, new HashChangeEvent('hashchange'))
    await waitFor(() => expect(screen.getByText('home-page')).toBeInTheDocument())
  })
})
