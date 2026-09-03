import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTypingSession } from '../core/use-typing-session'

function TypingHarness({ enabled = true, word = 'cat' }: { enabled?: boolean; word?: string }) {
  const session = useTypingSession(word, enabled)
  return (
    <div>
      <output data-testid="typed">{session.snapshot.typed}</output>
      <output data-testid="event">{session.lastEvent?.type ?? 'none'}</output>
      <input aria-label="ignored input" />
      <textarea aria-label="ignored textarea" />
      <select aria-label="ignored select"><option>cat</option></select>
    </div>
  )
}

describe('useTypingSession', () => {
  it('owns global typing and supports backspace without advancing on mistakes', () => {
    render(<TypingHarness />)

    fireEvent.keyDown(window, { key: 'x' })
    expect(screen.getByTestId('typed')).toHaveTextContent('')
    expect(screen.getByTestId('event')).toHaveTextContent('mistake')

    fireEvent.keyDown(window, { key: 'c' })
    expect(screen.getByTestId('typed')).toHaveTextContent('c')
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(screen.getByTestId('typed')).toHaveTextContent('')
    expect(screen.getByTestId('event')).toHaveTextContent('backspace')
  })

  it('ignores editable form controls and browser modifier shortcuts', () => {
    render(<TypingHarness />)

    fireEvent.keyDown(screen.getByLabelText('ignored input'), { key: 'c' })
    fireEvent.keyDown(screen.getByLabelText('ignored textarea'), { key: 'c' })
    fireEvent.keyDown(screen.getByLabelText('ignored select'), { key: 'c' })
    fireEvent.keyDown(window, { key: 'c', metaKey: true })
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'c', altKey: true })

    expect(screen.getByTestId('typed')).toHaveTextContent('')
    expect(screen.getByTestId('event')).toHaveTextContent('none')
  })

  it('prevents browser actions for accepted Space and Backspace keys', () => {
    render(<TypingHarness />)
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    act(() => window.dispatchEvent(space))
    expect(space.defaultPrevented).toBe(true)

    fireEvent.keyDown(window, { key: 'c' })
    const backspace = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
    act(() => window.dispatchEvent(backspace))
    expect(backspace.defaultPrevented).toBe(true)
  })

  it('detaches the global boundary while the session is disabled', () => {
    render(<TypingHarness enabled={false} />)
    fireEvent.keyDown(window, { key: 'c' })
    expect(screen.getByTestId('typed')).toHaveTextContent('')
    expect(screen.getByTestId('event')).toHaveTextContent('none')
  })

  it('resets on target changes and reattaches after being enabled', () => {
    const view = render(<TypingHarness word="cat" enabled />)
    fireEvent.keyDown(window, { key: 'c' })
    expect(screen.getByTestId('typed')).toHaveTextContent('c')

    view.rerender(<TypingHarness word="book" enabled={false} />)
    expect(screen.getByTestId('typed')).toHaveTextContent('')
    expect(screen.getByTestId('event')).toHaveTextContent('none')
    fireEvent.keyDown(window, { key: 'b' })
    expect(screen.getByTestId('typed')).toHaveTextContent('')

    view.rerender(<TypingHarness word="book" enabled />)
    fireEvent.keyDown(window, { key: 'b' })
    expect(screen.getByTestId('typed')).toHaveTextContent('b')
    expect(screen.getByTestId('event')).toHaveTextContent('correct')
  })
})
