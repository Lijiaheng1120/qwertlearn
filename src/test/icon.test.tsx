import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon, type IconName } from '../ui/Icon'

const iconNames: IconName[] = [
  'arrow', 'back', 'book', 'chart', 'heart', 'home', 'keyboard', 'music', 'parent',
  'pause', 'play', 'sound', 'soundOff', 'star', 'timer', 'trophy',
]

describe('Icon', () => {
  it('renders every owned icon as a decorative SVG and forwards SVG props', () => {
    for (const name of iconNames) {
      const view = render(<Icon name={name} data-testid={`icon-${name}`} className="owned-icon" />)
      const icon = view.getByTestId(`icon-${name}`)
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
      expect(icon).toHaveClass('owned-icon')
      view.unmount()
    }
  })
})
