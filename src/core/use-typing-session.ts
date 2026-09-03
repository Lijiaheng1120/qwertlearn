import { useCallback, useEffect, useRef, useState } from 'react'
import { TypingEngine, type TypingInputEvent, type TypingSnapshot } from './typing-engine'

export interface SequencedTypingEvent extends TypingInputEvent {
  sequence: number
}

export interface TypingSession {
  snapshot: TypingSnapshot
  lastEvent: SequencedTypingEvent | null
  reset: (nextWord?: string) => void
}

export function useTypingSession(word: string, enabled = true): TypingSession {
  const engineRef = useRef<TypingEngine | null>(null)
  if (engineRef.current === null) {
    engineRef.current = new TypingEngine(word)
  }

  const [snapshot, setSnapshot] = useState(() => engineRef.current!.snapshot())
  const [lastEvent, setLastEvent] = useState<SequencedTypingEvent | null>(null)
  const sequenceRef = useRef(0)

  const reset = useCallback((nextWord = word) => {
    setSnapshot(engineRef.current!.reset(nextWord))
    setLastEvent(null)
  }, [word])

  useEffect(() => {
    reset(word)
  }, [reset, word])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return

      const result = engineRef.current!.input(event.key)
      if (result.type === 'ignored') return

      if (event.key === 'Backspace' || event.key === ' ') {
        event.preventDefault()
      }

      sequenceRef.current += 1
      setSnapshot(result.snapshot)
      setLastEvent({ ...result, sequence: sequenceRef.current })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])

  return { snapshot, lastEvent, reset }
}
