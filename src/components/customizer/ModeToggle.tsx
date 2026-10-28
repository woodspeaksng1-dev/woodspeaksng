"use client";

export type WriteMode = "manual" | "assisted";

/** "Write it myself" / "Help me write it". Switching keeps what's been typed. */
export function ModeToggle({ mode, onChange }: { mode: WriteMode; onChange: (m: WriteMode) => void }) {
  const option = (value: WriteMode, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === value}
      onClick={() => onChange(value)}
      className={`h-10 flex-1 rounded-full text-sm transition-colors ${
        mode === value ? "bg-oxblood text-vellum" : "text-ink hover:text-oxblood"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="How do you want to write it?" className="flex gap-1 rounded-full border border-rule bg-vellum p-1">
      {option("manual", "Write it myself")}
      {option("assisted", "Help me write it")}
    </div>
  );
}
