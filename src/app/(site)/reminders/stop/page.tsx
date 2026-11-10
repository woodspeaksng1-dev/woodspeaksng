import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Stop reminders", robots: { index: false } };

/** Where the "Stop these reminders" link in a reminder email lands. The button does the stopping (a POST). */
export default function StopRemindersPage({ searchParams }: PageProps<"/reminders/stop">) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-10 pb-28 text-center sm:px-6">
      <Suspense fallback={<p className="py-24 text-ink-soft">One moment…</p>}>
        <Stop searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Stop({ searchParams }: Pick<PageProps<"/reminders/stop">, "searchParams">) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");

  if (one("done"))
    return (
      <>
        <h1 className="text-4xl text-oxblood">Reminders stopped</h1>
        <p className="mt-4 text-lg text-ink-soft">We won&rsquo;t email you about that date again.</p>
        <Link href="/" className="mt-8 inline-block text-oxblood underline underline-offset-4">
          Back to Woodspeaks
        </Link>
      </>
    );

  const order = one("order");
  const token = one("t");
  if (one("invalid") || !order || !token)
    return (
      <>
        <h1 className="text-4xl text-oxblood">That link didn&rsquo;t work</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Use the link in your latest reminder email, or sign in to{" "}
          <Link href="/account" className="text-oxblood underline underline-offset-2">
            your account
          </Link>{" "}
          to stop reminders there.
        </p>
      </>
    );

  return (
    <>
      <h1 className="text-4xl text-oxblood">Stop your yearly reminder?</h1>
      <p className="mt-4 text-lg text-ink-soft">We&rsquo;ll stop emailing you before this date each year. You can set it again from any order.</p>
      <form method="post" action={`/api/reminders/stop?order=${encodeURIComponent(order)}&t=${encodeURIComponent(token)}`} className="mt-8">
        <button type="submit" className="h-12 rounded-full bg-oxblood px-8 text-vellum transition-colors hover:bg-wine">
          Stop reminders
        </button>
      </form>
    </>
  );
}
