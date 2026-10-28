import type { SVGProps } from "react";

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const UserIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </svg>
);

export const BagIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

export const MenuIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const MinusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M6 12h12" />
  </svg>
);

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M6 12h12M12 6v12" />
  </svg>
);

export const ChatIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.6 18.6l-4.1.9Z" />
    <path d="M9.2 9.3c.3 2.4 2.1 4.4 4.6 5l1.1-1.2 1.6.9c-.2 1-1 1.6-2 1.6-3.4-.3-6.3-3.1-6.6-6.6 0-1 .6-1.8 1.6-2l.9 1.6-1.2.7Z" />
  </svg>
);

/** Placeholder wizard mark until the client's mascot artwork arrives. */
export const WizardHatIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} viewBox="0 0 32 32" {...p}>
    <path d="M6 25.5h20" strokeWidth={1.8} />
    <path d="M9 25.5 15.2 5.5c.3-.9 1.5-1 1.9-.1l2.2 4.6-2.6 1.6 4.6 13.9" strokeWidth={1.8} />
    <path d="M12.6 14.2l1.4.4M18 18.5l1.6-.7M13.4 20.6h1.6" strokeWidth={1.6} />
  </svg>
);

export const PenIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M14.5 5.5 18.5 9.5" />
    <path d="M5 19l1-4.5L15.8 4.7a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L9.5 18 5 19Z" />
  </svg>
);

export const PlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} viewBox="0 0 20 20" {...p}>
    <path
      d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L10 1.8Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);
