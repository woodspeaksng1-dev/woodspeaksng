"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { removeMoment, reorderMoment, saveMoment, showMoment } from "@/app/admin/(panel)/moments/actions";
import { ABOUT_MOMENTS, HOME_MOMENTS, type Moment } from "@/lib/gallery";
import { inputClass } from "../ui/FormField";
import { AdminHeader, Badge, Card, adminButton, adminButtonQuiet } from "./AdminShell";
import { shrinkPhoto } from "./shrink-photo";

type Result = { ok: boolean; message: string };
type ProductOption = { slug: string; name: string };

const label = "text-sm font-semibold text-ink";
const hint = "mt-1 block text-xs font-normal text-ink-soft";

interface Words {
  caption: string;
  who: string;
  productSlug: string;
}

/** Caption, name and product: the words on a moment, for adding and editing. */
function WordsFields({ words, products, onChange }: { words: Words; products: ProductOption[]; onChange: (w: Words) => void }) {
  const set = (key: keyof Words, value: string) => onChange({ ...words, [key]: value });
  return (
    <>
      <label className={label}>
        Caption
        <input value={words.caption} onChange={(e) => set("caption", e.target.value)} placeholder="e.g. The moment she unrolled it" className={`${inputClass} font-normal`} />
        <span className={hint}>What&rsquo;s happening in the photo, in a few words.</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Name (optional)
          <input value={words.who} onChange={(e) => set("who", e.target.value)} placeholder="e.g. Tolu, Lekki" className={`${inputClass} font-normal`} />
          <span className={hint}>Only if the customer is happy to be named.</span>
        </label>
        <label className={label}>
          Product in the photo
          <select value={words.productSlug} onChange={(e) => set("productSlug", e.target.value)} className={`${inputClass} font-normal`}>
            <option value="">None</option>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <span className={hint}>The gallery links to it.</span>
        </label>
      </div>
    </>
  );
}

const Message = ({ msg }: { msg: Result | null }) =>
  msg && (
    <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ink" : "text-oxblood"}`}>
      {msg.message}
    </p>
  );

/** Add a moment: a photo, its words, and the customer's OK. */
function AddMoment({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [words, setWords] = useState<Words>({ caption: "", who: "", productSlug: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Result | null>(null);

  // Show the chosen photo; let go of the previous preview's memory.
  const previewRef = useRef<string | null>(null);
  const choose = (next: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setPreview(previewRef.current);
    setFile(next);
  };
  useEffect(() => () => void (previewRef.current && URL.revokeObjectURL(previewRef.current)), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!file) return setMsg({ ok: false, message: "Choose a photo." });
    if (!consent) return setMsg({ ok: false, message: "Tick that the customer is happy for us to share it." });
    setBusy(true);
    try {
      const form = new FormData();
      form.set("photo", await shrinkPhoto(file));
      form.set("caption", words.caption);
      form.set("who", words.who);
      form.set("productSlug", words.productSlug);
      form.set("consent", "yes");
      const res = await fetch("/api/admin/moments", { method: "POST", body: form });
      const result = (await res.json().catch(() => ({}))) as Partial<Result>;
      setMsg({ ok: res.ok, message: result.message ?? (res.ok ? "Added." : "That didn't work. Try again.") });
      if (res.ok) {
        choose(null);
        setWords({ caption: "", who: "", productSlug: "" });
        setConsent(false);
        if (input.current) input.current.value = "";
        router.refresh();
      }
    } catch (error) {
      setMsg({ ok: false, message: error instanceof Error ? error.message : "That didn't work. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      <div>
        <span className={label}>Photo</span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            setMsg(null);
            choose(e.target.files?.[0] ?? null);
          }}
        />
        <div className="mt-1.5 flex items-center gap-4">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="The chosen photo" className="aspect-[4/5] w-20 shrink-0 rounded-xl object-cover" />
          )}
          <button type="button" onClick={() => input.current?.click()} className={`${adminButtonQuiet} h-10 px-5`}>
            {file ? "Choose another" : "Choose a photo"}
          </button>
        </div>
        <span className={hint}>Upright (4:5) works best: it&rsquo;s shown in a tall card.</span>
      </div>
      <WordsFields words={words} products={products} onChange={setWords} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-oxblood" />
        The customer agreed to us sharing this photo on the website.
      </label>
      <div>
        <button type="submit" disabled={busy} className={adminButton}>
          {busy ? "Adding…" : "Add moment"}
        </button>
      </div>
      <Message msg={msg} />
    </form>
  );
}

function MomentRow({ moment: m, products, place, first, last }: { moment: Moment; products: ProductOption[]; place: string | null; first: boolean; last: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [words, setWords] = useState<Words>({ caption: m.caption, who: m.who ?? "", productSlug: m.productSlug ?? "" });
  const [msg, setMsg] = useState<Result | null>(null);
  const [busy, start] = useTransition();
  const product = m.productSlug ? (products.find((p) => p.slug === m.productSlug)?.name ?? "A product no longer listed") : null;

  const run = (action: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const res = await action();
      setMsg(res);
      if (res.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <li className={`flex gap-4 py-5 ${m.visible || editing ? "" : "opacity-60"}`}>
      {m.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image} alt="" className="aspect-[4/5] w-20 shrink-0 self-start rounded-xl object-cover sm:w-24" />
      ) : (
        <div className="aspect-[4/5] w-20 shrink-0 self-start rounded-xl bg-sand sm:w-24" />
      )}
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveMoment(m.id, words), () => setEditing(false));
            }}
          >
            <WordsFields words={words} products={products} onChange={setWords} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy} className={adminButton}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-sm text-ink-soft underline underline-offset-2">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="font-display text-lg leading-snug">{m.caption}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              {m.who && <span>{m.who}</span>}
              {product && <span>{product}</span>}
              {place && <Badge tone="gold">{place}</Badge>}
              {!m.visible && <Badge tone="quiet">Hidden</Badge>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => setEditing(true)} className={`${adminButtonQuiet} h-9 px-4`}>
                Edit
              </button>
              <button type="button" disabled={busy} onClick={() => run(() => showMoment(m.id, !m.visible))} className={`${adminButtonQuiet} h-9 px-4`}>
                {m.visible ? "Hide" : "Show"}
              </button>
              <button type="button" disabled={busy || first} onClick={() => run(() => reorderMoment(m.id, "up"))} className={`${adminButtonQuiet} h-9 px-4`} aria-label={`Move "${m.caption}" up`}>
                Move up
              </button>
              <button type="button" disabled={busy || last} onClick={() => run(() => reorderMoment(m.id, "down"))} className={`${adminButtonQuiet} h-9 px-4`} aria-label={`Move "${m.caption}" down`}>
                Move down
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => window.confirm(`Delete "${m.caption}" and its photo? This can't be undone; Hide keeps it.`) && run(() => removeMoment(m.id))}
                className="h-9 px-3 text-sm text-oxblood underline underline-offset-2"
              >
                Delete
              </button>
            </div>
          </>
        )}
        <div className="mt-2">
          <Message msg={msg} />
        </div>
      </div>
    </li>
  );
}

/** Add, edit, hide, reorder and delete customer moments (home page, About and the gallery). */
export function MomentsManager({ moments, products }: { moments: Moment[]; products: ProductOption[] }) {
  const shown = moments.filter((m) => m.visible);
  // Where each shown moment appears, by its place among the shown ones.
  const placeOf = (m: Moment) => {
    const i = shown.indexOf(m);
    if (i < 0) return null;
    if (i < ABOUT_MOMENTS) return "Home, About and gallery";
    if (i < HOME_MOMENTS) return "Home and gallery";
    return "Gallery";
  };
  return (
    <div>
      <AdminHeader
        title="Moments"
        intro={`Photos customers have shared. ${shown.length} of ${moments.length} on the site. The home page shows the first ${HOME_MOMENTS} shown, About the first ${ABOUT_MOMENTS}, and the gallery all of them, in this order.`}
      />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_24rem]">
        <Card className="self-start xl:order-2">
          <h2 className="mb-4 text-2xl text-oxblood">Add a moment</h2>
          <AddMoment products={products} />
        </Card>
        <Card>
          {moments.length === 0 ? (
            <p className="text-ink-soft">No moments yet. Add the first one.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {moments.map((m, i) => (
                <MomentRow key={m.id} moment={m} products={products} place={placeOf(m)} first={i === 0} last={i === moments.length - 1} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
