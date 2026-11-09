import { formatNaira } from "@/lib/format";
import type { CartCustomization } from "@/lib/types";

export interface OrderLineView {
  key: string;
  name: string;
  quantity: number;
  total: number;
  customization: CartCustomization;
}

function Personalisation({ c }: { c: CartCustomization }) {
  if (c.kind === "letter")
    return <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-ink-soft italic">&ldquo;{c.text}&rdquo;</p>;
  if (c.kind === "reasons")
    return (
      <p className="mt-1 text-sm text-ink-soft">
        {c.mode === "custom" ? `Your own 20 reasons, starting “${c.reasons[0]}”` : "Our 20 reasons"}
      </p>
    );
  if (c.kind === "photo")
    return <p className="mt-1 truncate text-sm text-ink-soft">Photo: {c.photoNames[0] ?? "still needed"}</p>;
  if (c.kind === "video")
    return (
      <p className="mt-1 truncate text-sm text-ink-soft">{c.source === "file" ? `Video: ${c.fileName}` : `Video link: ${c.url}`}</p>
    );
  return null;
}

/** Items with their personalisation, for the checkout summary and the confirmation page. */
export function OrderLines({ lines }: { lines: OrderLineView[] }) {
  return (
    <ul className="flex flex-col divide-y divide-rule">
      {lines.map((l) => (
        <li key={l.key} className="flex gap-4 py-4 first:pt-0">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-snug">
              {l.name}
              {l.quantity > 1 && <span className="text-ink-soft"> × {l.quantity}</span>}
            </p>
            <Personalisation c={l.customization} />
          </div>
          <p className="shrink-0 tabular-nums">{formatNaira(l.total)}</p>
        </li>
      ))}
    </ul>
  );
}
