import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
      <h1 className="text-5xl text-oxblood">This page has gone quiet</h1>
      <p className="mt-4 text-lg text-ink-soft">The link may be old, or the page may have moved.</p>
      <Link
        href="/shop"
        className="mt-8 rounded-full bg-oxblood px-8 py-3.5 text-vellum transition-colors hover:bg-wine"
      >
        Browse the shop
      </Link>
    </div>
  );
}
