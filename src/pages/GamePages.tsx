import type { AudioSettings } from '../core/audio-service'
import type { RewardSlot, WordMemory } from '../core/models'
import type { AppRoute } from '../App'
import { ChaseGamePage } from './ChaseGamePage'
import { FrogGamePage } from './FrogGamePage'
import { TrainingPage } from './TrainingPage'

interface GamePagesProps {
  route: Exclude<AppRoute, 'home' | 'wordbook' | 'rewards' | 'parent'>
  wordMemory: WordMemory[]
  highestFrogStage: number
  equippedRewards: Partial<Record<RewardSlot, string>>
  audioSettings: AudioSettings
  navigate: (route: AppRoute) => void
  toggleAudio: () => void
  onRunSaved: () => Promise<void>
}

export function GamePages({ route, wordMemory, highestFrogStage, equippedRewards, ...props }: GamePagesProps) {
  if (route === 'frog') return <FrogGamePage {...props} wordMemory={wordMemory} highestUnlockedStage={highestFrogStage} equippedRewards={equippedRewards} />
  if (route === 'chase') return <ChaseGamePage {...props} wordMemory={wordMemory} equippedRewards={equippedRewards} />
  return <TrainingPage {...props} />
}
