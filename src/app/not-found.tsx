import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-6xl">🔭</div>
      <h1 className="font-arsans text-2xl font-bold text-bone/90">This page is out of reach</h1>
      <p className="max-w-xs font-arsans text-base text-bone/50">The cosmos is vast, but this path doesn&apos;t exist yet.</p>
      <Link
        href="/"
        className="ui-action rounded-xl border border-gold/35 bg-gold/[0.07] px-6 py-3 text-gold transition-all hover:bg-gold hover:text-ink active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      >
        Return home
      </Link>
    </div>
  );
}
