import Link from "next/link";

/** Temporary page body for routes built in later stages. Remove before launch. */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
      <h1 className="text-5xl text-oxblood">{title}</h1>
      <p className="mt-4 text-lg text-ink-soft">{note}</p>
      <Link href="/shop" className="mt-8 text-oxblood underline underline-offset-4">
        Back to the shop
      </Link>
    </div>
  );
}
