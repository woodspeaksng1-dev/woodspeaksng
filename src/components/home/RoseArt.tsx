/**
 * PLACEHOLDER rose, drawn until the real rose render (hero/rose) is in public/media.
 * Lit petals and a curved stem; layered so it reads as a flower, not an icon.
 */
export function RoseArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 300" className={className} aria-hidden>
      <defs>
        <radialGradient id="rose-back" cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="var(--color-rose)" />
          <stop offset="1" stopColor="var(--color-rose-deep)" />
        </radialGradient>
        <radialGradient id="rose-front" cx="0.4" cy="0.2" r="0.9">
          <stop offset="0" stopColor="var(--color-wine)" />
          <stop offset="0.5" stopColor="var(--color-rose)" />
          <stop offset="1" stopColor="var(--color-rose-deep)" />
        </radialGradient>
        <linearGradient id="rose-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.28" />
          <stop offset="0.35" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rose-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-leaf-light)" />
          <stop offset="1" stopColor="var(--color-leaf)" />
        </linearGradient>
        <filter id="rose-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="8" stdDeviation="7" floodColor="var(--color-ink)" floodOpacity="0.28" />
        </filter>
      </defs>
      <g filter="url(#rose-soft)">
        {/* Stem and leaves */}
        <path d="M100 128 C97 170 106 214 94 292" fill="none" stroke="url(#rose-leaf)" strokeWidth="5" strokeLinecap="round" />
        <path d="M99 178 C80 158 58 162 48 178 C66 190 88 190 99 178Z" fill="url(#rose-leaf)" />
        <path d="M99 178 C82 175 66 176 52 178" fill="none" stroke="var(--color-leaf)" strokeWidth="1" opacity="0.6" />
        <path d="M101 218 C122 200 146 205 154 220 C136 230 114 229 101 218Z" fill="url(#rose-leaf)" />
        <path d="M101 218 C118 216 136 217 150 220" fill="none" stroke="var(--color-leaf)" strokeWidth="1" opacity="0.6" />
        <path d="M100 126 C90 132 84 140 82 146 C92 142 98 136 100 130 C102 136 108 142 118 146 C116 140 110 132 100 126Z" fill="url(#rose-leaf)" />

        {/* Bloom, back to front */}
        <path d="M100 30 C56 18 30 62 46 102 C60 132 92 128 100 116Z" fill="url(#rose-back)" />
        <path d="M100 30 C144 18 170 62 154 102 C140 132 108 128 100 116Z" fill="url(#rose-back)" />
        <path d="M80 62 C78 34 122 30 122 60 C122 82 82 86 80 62Z" fill="url(#rose-front)" />
        <path d="M88 58 C92 46 112 46 112 60 C110 72 94 72 96 62 C98 56 106 56 105 62" fill="none" stroke="var(--color-rose-deep)" strokeWidth="1.6" strokeOpacity="0.7" />
        <path d="M44 80 C46 118 80 136 100 132 C88 112 74 96 68 70Z" fill="url(#rose-front)" />
        <path d="M156 80 C154 118 120 136 100 132 C112 112 126 96 132 70Z" fill="url(#rose-front)" />
        <path d="M54 96 C66 142 134 142 146 96 C130 118 70 118 54 96Z" fill="url(#rose-front)" />
        <path d="M54 96 C66 142 134 142 146 96 C130 118 70 118 54 96Z" fill="url(#rose-edge)" />
        <path d="M44 80 C46 118 80 136 100 132 C88 112 74 96 68 70Z" fill="url(#rose-edge)" />
        <path d="M80 62 C78 34 122 30 122 60" fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="2" />
      </g>
    </svg>
  );
}
