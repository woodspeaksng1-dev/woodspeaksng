import type { ReactNode } from "react";

/*
 * The open locket, drawn to match the real one (antique brass, see the product photo): the photo half
 * face on, with a beaded edge and a stepped bezel; the lid swung open on its hinge to the left; the bail
 * and chain on top. Light comes from the top left. The photo sits in an HTML slot over the drawing (so
 * zoom and drag keep working) and the glass is drawn over it.
 *
 * Drawing units: viewBox 0 -40 400 380. Photo half centred at (250, 190), radius 128; opening radius 97.
 */
const VIEW = "0 -40 400 380";
const CX = 250;
const CY = 190;
const OPENING = 97;
// The slot's position as percentages of the drawing, so it scales with it.
const SLOT = {
  left: `${((CX - OPENING) / 400) * 100}%`,
  top: `${((CY - OPENING + 40) / 380) * 100}%`,
  width: `${((OPENING * 2) / 400) * 100}%`,
};

const BEADS = Array.from({ length: 64 }, (_, i) => {
  const a = (i / 64) * Math.PI * 2;
  return { x: CX + Math.cos(a) * 121, y: CY + Math.sin(a) * 121 };
});

const c = (token: string) => `var(--color-${token})`;

/** A gear outline (like the embossing on the locket's cover), centred on 0,0. */
function gear(r: number, teeth: number) {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r : r * 1.14;
    pts.push(`${Math.cos(a0) * rr},${Math.sin(a0) * rr}`, `${Math.cos(a1) * rr},${Math.sin(a1) * rr}`);
  }
  return `M${pts.join("L")}Z`;
}

// Engraved inside the lid, laid out on a face of radius 116 and foreshortened with the lid.
const LID_GEARS = [
  { x: -18, y: -38, r: 40, teeth: 12 },
  { x: 36, y: 28, r: 28, teeth: 10 },
  { x: -28, y: 58, r: 19, teeth: 8 },
];

function Engraving() {
  const shapes = LID_GEARS.map((g) => (
    <g key={g.x} transform={`translate(${g.x} ${g.y})`}>
      <path d={gear(g.r, g.teeth)} />
      <circle r={g.r * 0.62} />
      <circle r={g.r * 0.16} />
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2;
        return <line key={k} x1={Math.cos(a) * g.r * 0.16} y1={Math.sin(a) * g.r * 0.16} x2={Math.cos(a) * g.r * 0.62} y2={Math.sin(a) * g.r * 0.62} />;
      })}
    </g>
  ));
  return (
    <g fill="none" strokeWidth="1.6" transform="translate(72 190) scale(0.388 1)">
      <g stroke={c("brass-shine")} strokeOpacity="0.45" transform="translate(1.4 1.2)">
        {shapes}
      </g>
      <g stroke={c("brass-shadow")} strokeOpacity="0.6">
        {shapes}
      </g>
    </g>
  );
}

export function LocketFrame({ children }: { children: ReactNode }) {
  return (
    <figure
      aria-label="Preview of your locket"
      className="relative mx-auto aspect-[400/380] w-full max-w-sm drop-shadow-[0_14px_14px_rgb(42_23_18/0.35)]"
    >
      <svg aria-hidden viewBox={VIEW} className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          {/* Brushed metal: light top left, falling into shadow bottom right. */}
          <linearGradient id="lk-rim" x1="0.15" y1="0.05" x2="0.85" y2="0.95">
            <stop offset="0" stopColor={c("brass-shine")} />
            <stop offset="0.22" stopColor={c("brass-light")} />
            <stop offset="0.5" stopColor={c("brass")} />
            <stop offset="0.78" stopColor={c("brass-dark")} />
            <stop offset="1" stopColor={c("brass-shadow")} />
          </linearGradient>
          <linearGradient id="lk-bezel" x1="0.85" y1="0.95" x2="0.15" y2="0.05">
            <stop offset="0" stopColor={c("brass-light")} />
            <stop offset="0.5" stopColor={c("brass")} />
            <stop offset="1" stopColor={c("brass-shadow")} />
          </linearGradient>
          {/* Inside of the lid: a shallow dish, brighter where it faces the light. */}
          <radialGradient id="lk-dish" cx="0.65" cy="0.35" r="0.85">
            <stop offset="0" stopColor={c("brass-shine")} />
            <stop offset="0.35" stopColor={c("brass-light")} />
            <stop offset="0.8" stopColor={c("brass")} />
            <stop offset="1" stopColor={c("brass-dark")} />
          </radialGradient>
          <filter id="lk-brush" x="0" y="0" width="1" height="1">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.06  0 0 0 0.2 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        {/* Chain: links alternate face on and edge on, then the bail */}
        <rect x={CX - 2.5} y={-48} width="5" height="24" rx="2.5" fill="url(#lk-bezel)" />
        <ellipse cx={CX} cy={-20} rx="6.5" ry="13" fill="none" stroke="url(#lk-rim)" strokeWidth="3.5" />
        <rect x={CX - 2.5} y={-6} width="5" height="24" rx="2.5" fill="url(#lk-bezel)" />
        <circle cx={CX} cy={30} r="15" fill="none" stroke="url(#lk-rim)" strokeWidth="6" />
        <path d={`M${CX - 14} 66 Q${CX - 14} 46 ${CX} 46 Q${CX + 14} 46 ${CX + 14} 66 Z`} fill="url(#lk-rim)" />
        <rect x={CX - 9} y={42} width="18" height="7" rx="3" fill={c("brass-light")} />

        {/* Lid, swung open on the hinge and seen at an angle */}
        <ellipse cx="70" cy={CY} rx="54" ry="128" fill="url(#lk-rim)" />
        <ellipse cx="72" cy={CY} rx="45" ry="116" fill="url(#lk-dish)" />
        <ellipse cx="72" cy={CY} rx="45" ry="116" fill="none" stroke={c("brass-shadow")} strokeOpacity="0.45" strokeWidth="1.5" />
        <Engraving />

        {/* Hinge */}
        {[150, 176, 202].map((y, i) => (
          <rect
            key={y}
            x="116"
            y={y}
            width="14"
            height="24"
            rx="5"
            fill={i === 1 ? c("brass") : "url(#lk-bezel)"}
            stroke={c("brass-shadow")}
            strokeWidth="1"
          />
        ))}

        {/* Photo half: rim, beaded edge, groove, stepped bezel */}
        <circle cx={CX} cy={CY} r="128" fill="url(#lk-rim)" />
        <circle cx={CX} cy={CY} r="128" fill="url(#lk-rim)" filter="url(#lk-brush)" />
        <circle cx={CX} cy={CY} r="127" fill="none" stroke={c("brass-shadow")} strokeOpacity="0.6" strokeWidth="2" />
        {/* Raised beads: shadow below right, bead, highlight above left */}
        {BEADS.map((b, i) => (
          <g key={i}>
            <circle cx={b.x + 0.9} cy={b.y + 0.9} r="3.1" fill={c("brass-shadow")} opacity="0.55" />
            <circle cx={b.x} cy={b.y} r="2.9" fill={c("brass-light")} />
            <circle cx={b.x - 0.9} cy={b.y - 0.9} r="1.1" fill={c("brass-shine")} />
          </g>
        ))}
        <circle cx={CX} cy={CY} r="113" fill="none" stroke={c("brass-shadow")} strokeOpacity="0.55" strokeWidth="2" />
        <circle cx={CX} cy={CY} r="112" fill="none" stroke={c("brass-shine")} strokeOpacity="0.35" strokeWidth="1" transform={`translate(1 1)`} />
        <circle cx={CX} cy={CY} r="105" fill="url(#lk-bezel)" />
        <circle cx={CX} cy={CY} r={OPENING + 1} fill={c("brass-shadow")} />
      </svg>

      {/* Photo slot */}
      <div className="absolute aspect-square overflow-hidden rounded-full" style={SLOT}>
        {children}
      </div>

      {/* Glass over the photo: a soft inner shadow under the bezel and a highlight from the light */}
      <svg aria-hidden viewBox={VIEW} className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="lk-inset" cx="0.56" cy="0.58" r="0.56">
            <stop offset="0.8" stopColor={c("brass-shadow")} stopOpacity="0" />
            <stop offset="1" stopColor={c("brass-shadow")} stopOpacity="0.6" />
          </radialGradient>
          <linearGradient id="lk-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c("vellum")} stopOpacity="0.32" />
            <stop offset="0.45" stopColor={c("vellum")} stopOpacity="0.04" />
            <stop offset="1" stopColor={c("vellum")} stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx={CX} cy={CY} r={OPENING} fill="url(#lk-inset)" />
        <path
          d={`M${CX - 80} ${CY - 20} A${OPENING - 8} ${OPENING - 8} 0 0 1 ${CX + 10} ${CY - 88} Q${CX - 40} ${CY - 70} ${CX - 80} ${CY - 20} Z`}
          fill="url(#lk-glass)"
        />
        <circle cx={CX} cy={CY} r={OPENING} fill="none" stroke={c("vellum")} strokeOpacity="0.18" strokeWidth="1" />
      </svg>
    </figure>
  );
}
