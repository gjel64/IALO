// Line icons (24×24 grid, stroke-based) used instead of emoji for a consistent, sober UI.
const PATHS = {
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4',
  download: 'M12 3v12M7 10l5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4',
  back: 'M19 12H5M11 18l-6-6 6-6',
  next: 'M5 12h14M13 6l6 6-6 6',
  check: 'M20 6 9 17l-5-5',
  close: 'M18 6 6 18M6 6l12 12',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  play: 'M7 4v16l13-8Z',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  slides: 'M3 4h18v12H3zM12 16v4M8 20h8',
  book: 'M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4ZM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6Z',
  pdf: 'M14 3H6v18h12V7ZM14 3v4h4M9 13h6M9 17h6',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1',
  link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  toggle: 'M12 3v18M4 7h5M4 12h5M4 17h5M15 7h5M15 12h5M15 17h5',
  blanks: 'M4 7h6M14 7h6M4 12h2M10 12h10M4 17h10M18 17h2',
  drag: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  move: 'M15 10l5 5-5 5M4 4v7a4 4 0 0 0 4 4h12',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  prev: 'M15 18l-6-6 6-6',
  forward: 'M9 18l6-6-6-6',
  retry: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
} as const

export type IconName = keyof typeof PATHS

export const Icon = ({ name, size = 16 }: { name: IconName; size?: number }) => (
  <svg className="i" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
)
