import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

/** Where "Unsubscribe" in a customer email lands. The button does it (a POST). */
export default function UnsubscribePage({ searchParams }: PageProps<"/emails/unsubscribe">) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-10 pb-28 text-center sm:px-6">
      <Suspense fallback={<p className="py-24 text-ink-soft">One moment…</p>}>
        <Unsubscribe searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Unsubscribe({ searchParams }: Pick<PageProps<"/emails/unsubscribe">, "searchParams">) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");

  if (one("done"))
    return (
      <>
        <h1 className="text-4xl text-oxblood">You&rsquo;re unsubscribed</h1>
        <p className="mt-4 text-lg text-ink-soft">
          We won&rsquo;t send you updates any more. Emails about your orders and any yearly reminder you set still come.
        </p>
        <Link href="/" className="mt-8 inline-block text-oxblood underline underline-offset-4">
          Back to Woodspeaks
        </Link>
      </>
    );

  const token = one("t");
  if (one("invalid") || !token)
    return (
      <>
        <h1 className="text-4xl text-oxblood">That link didn&rsquo;t work</h1>
        <p className="mt-4 text-lg text-ink-soft">Use the link at the bottom of our latest email, or reply to it and we&rsquo;ll take you off the list.</p>
      </>
    );

  return (
    <>
      <h1 className="text-4xl text-oxblood">Stop getting updates?</h1>
      <p className="mt-4 text-lg text-ink-soft">You&rsquo;ll still get emails about your orders.</p>
      <form method="post" action={`/api/emails/unsubscribe?t=${encodeURIComponent(token)}`} className="mt-8">
        <button type="submit" className="h-12 rounded-full bg-oxblood px-8 text-vellum transition-colors hover:bg-wine">
          Unsubscribe
        </button>
      </form>
    </>
  );
}
