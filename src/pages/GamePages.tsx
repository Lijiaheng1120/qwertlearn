import type { AudioSettings } from '../core/audio-service'
import type { WordMemory } from '../core/models'
import type { AppRoute } from '../App'
import { ChaseGamePage } from './ChaseGamePage'
import { FrogGamePage } from './FrogGamePage'
import { TrainingPage } from './TrainingPage'

interface GamePagesProps {
  route: Exclude<AppRoute, 'home' | 'wordbook' | 'parent'>
  wordMemory: WordMemory[]
  audioSettings: AudioSettings
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

export function GamePages({ route, wordMemory, ...props }: GamePagesProps) {
  if (route === 'frog') return <FrogGamePage {...props} wordMemory={wordMemory} />
  if (route === 'chase') return <ChaseGamePage {...props} wordMemory={wordMemory} />
  return <TrainingPage {...props} />
}
