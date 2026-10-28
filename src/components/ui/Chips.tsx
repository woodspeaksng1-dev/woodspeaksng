"use client";

/** A row of single-choice pill buttons with a visible label. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm text-ink-soft">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(options) as T[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={value === key}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              value === key
                ? "border-oxblood bg-oxblood text-vellum"
                : "border-rule bg-vellum text-ink hover:border-oxblood"
            }`}
          >
            {options[key]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
