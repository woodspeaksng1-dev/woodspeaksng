"use client";

import { useId, type ReactNode } from "react";

/** Shared field styling and wrappers for the site's forms (checkout, corporate enquiry, account). */

export const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-rule bg-vellum px-3.5 text-ink outline-none focus:border-oxblood aria-[invalid=true]:border-oxblood";

export function TextField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-oxblood">
          {error}
        </p>
      )}
    </div>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-oxblood"
      />
      <span className="text-ink">{children}</span>
    </label>
  );
}
