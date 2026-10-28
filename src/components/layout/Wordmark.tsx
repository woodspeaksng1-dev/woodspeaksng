import Link from "next/link";

/** Text wordmark placeholder. Replace with the client's logo SVG when it arrives. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-[1.65rem] leading-none italic tracking-[-0.01em] ${className}`}
      aria-label="Woodspeaks home"
    >
      Woodspeaks
    </Link>
  );
}
