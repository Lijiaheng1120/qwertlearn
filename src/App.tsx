import { useCallback, useEffect, useState } from 'react'
import { audioService, type AudioSettings } from './core/audio-service'
import { EMPTY_DASHBOARD, type DashboardSummary } from './core/models'
import { progressStore } from './core/progress-store'
import { GamePages } from './pages/GamePages'
import { HomePage } from './pages/HomePage'
import { ParentDashboard } from './pages/ParentDashboard'
import { RewardCabinetPage } from './pages/RewardCabinetPage'
import { WordBookPage } from './pages/WordBookPage'

export type AppRoute = 'home' | 'training' | 'frog' | 'chase' | 'match' | 'wordbook' | 'rewards' | 'parent'

function readRoute(): AppRoute {
  const value = window.location.hash.replace(/^#\/?/, '')
  return ['training', 'frog', 'chase', 'match', 'wordbook', 'rewards', 'parent'].includes(value)
    ? value as AppRoute
    : 'home'
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(readRoute)
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_DASHBOARD)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => audioService.getSettings())

  const refreshSummary = useCallback(async () => {
    setSummary(await progressStore.getDashboardSummary())
  }, [])

  useEffect(() => {
    const handleHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    void refreshSummary()
    return audioService.subscribe(setAudioSettings)
  }, [refreshSummary])

  useEffect(() => {
    const handleVisibility = () => audioService.setPageHidden(document.hidden)
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const navigate = useCallback((nextRoute: AppRoute) => {
    window.location.hash = nextRoute === 'home' ? '#/' : `#/${nextRoute}`
    setRoute(nextRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    audioService.play('ui.click')
  }, [])

  const toggleAudio = useCallback(() => {
    void audioService.unlock()
    setAudioSettings(audioService.toggleMuted())
  }, [])

  if (route === 'home') {
    return (
      <HomePage
        summary={summary}
        audioSettings={audioSettings}
        navigate={navigate}
        toggleAudio={toggleAudio}
      />
    )
  }

  if (route === 'wordbook') {
    return (
      <WordBookPage
        summary={summary}
        audioSettings={audioSettings}
        navigate={navigate}
        toggleAudio={toggleAudio}
      />
    )
  }

  if (route === 'rewards') {
    return (
      <RewardCabinetPage
        summary={summary}
        audioSettings={audioSettings}
        navigate={navigate}
        toggleAudio={toggleAudio}
        onRewardChanged={refreshSummary}
      />
    )
  }

  if (route === 'parent') {
    return (
      <ParentDashboard
        summary={summary}
        audioSettings={audioSettings}
        navigate={navigate}
        toggleAudio={toggleAudio}
        onRewardChanged={refreshSummary}
      />
    )
  }

  return (
    <GamePages
      route={route}
      wordMemory={summary.wordMemory}
      highestFrogStage={summary.highestFrogStage}
      equippedRewards={summary.rewardState.equippedRewards}
      audioSettings={audioSettings}
      navigate={navigate}
      toggleAudio={toggleAudio}
      onRunSaved={refreshSummary}
    />
  )
}
