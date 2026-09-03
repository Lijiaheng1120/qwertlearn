import type { SVGProps } from 'react'

export type IconName =
  | 'arrow'
  | 'back'
  | 'book'
  | 'chart'
  | 'heart'
  | 'home'
  | 'keyboard'
  | 'music'
  | 'parent'
  | 'pause'
  | 'play'
  | 'sound'
  | 'soundOff'
  | 'star'
  | 'timer'
  | 'trophy'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
}

export function Icon({ name, ...props }: IconProps) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }

  switch (name) {
    case 'arrow': return <svg {...common}><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
    case 'back': return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>
    case 'book': return <svg {...common}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" /><path d="M4 18.5A3.5 3.5 0 0 1 7.5 15H20" /></svg>
    case 'chart': return <svg {...common}><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /></svg>
    case 'heart': return <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
    case 'home': return <svg {...common}><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9Z" /></svg>
    case 'keyboard': return <svg {...common}><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h5m3 0h1" /></svg>
    case 'music': return <svg {...common}><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>
    case 'parent': return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
    case 'pause': return <svg {...common}><path d="M9 5v14M15 5v14" /></svg>
    case 'play': return <svg {...common} fill="currentColor" stroke="none"><path d="m8 5 11 7-11 7V5Z" /></svg>
    case 'sound': return <svg {...common}><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" /><path d="M15 9c1.2 1.6 1.2 4.4 0 6m3-9c3 3.4 3 8.6 0 12" /></svg>
    case 'soundOff': return <svg {...common}><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" /><path d="m16 9 5 5m0-5-5 5" /></svg>
    case 'star': return <svg {...common}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
    case 'timer': return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></svg>
    case 'trophy': return <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8" /></svg>
  }
}
