import Link from "next/link";
import { personas } from "../../lib/personas";

const evidenceCards = [
  { label: "Core", value: "Arabic-first reflection PWA", detail: "Chat, companions, Daily Pulse, saved moments, quests, and proof cards." },
  { label: "AI", value: "Gemini / Vertex ready", detail: "Reflection, storyboard prompts, avatar generation, and local fallbacks." },
  { label: "Admin", value: "Live operations room", detail: "Auto-refreshing visits, signups, comments, installs, sessions, gifts, and persona grants." },
  { label: "Trust", value: "Non-clinical wellbeing", detail: "No medical, legal, financial, emergency, or regulated claims." },
];

const flows = [
  ["/judge", "Switches into the strongest judge demo flow."],
  ["/story", "Turns a feeling into a compact Story Mirror."],
  ["/proof", "Creates a share-ready before/after artifact."],
  ["/quest", "Starts a tiny 3-day growth challenge."],
];

export default function DemoEvidencePage() {
  const freeCount = personas.filter((persona) => !persona.isPremium).length;
  const plusCount = personas.length - freeCount;

  return (
    <main className="min-h-screen bg-ink px-5 pb-16 pt-24 text-bone/90">
      <section className="mx-auto max-w-6xl">
        <div className="border-b border-white/10 pb-8">
          <p className="ui-kicker text-gold">FadFada evidence room</p>
          <h1 className="mt-3 max-w-4xl font-arserif text-5xl text-bone/95">A calm Arabic-first product, with depth hidden one layer below the chat.</h1>
          <p className="mt-4 max-w-2xl font-arsans text-sm leading-7 text-bone/60">This page is a compact judge view of the product: what works, where the modules live, and how to demo the strongest flows without crowding the main interface.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="ui-action bg-gold px-4 py-3 text-ink hover:bg-bone">Open app</Link>
            <Link href="/admin/dashboard" className="ui-action border border-white/15 px-4 py-3 text-bone/80 hover:border-gold/45 hover:text-gold">Admin dashboard</Link>
            <Link href="/profile" className="ui-action border border-white/15 px-4 py-3 text-bone/80 hover:border-gold/45 hover:text-gold">Journey profile</Link>
          </div>
        </div>

        <section className="grid gap-4 border-b border-white/10 py-8 md:grid-cols-4">
          {evidenceCards.map((card) => (
            <article key={card.label} className="border border-white/10 bg-white/[0.025] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-gold/70">{card.label}</p>
              <h2 className="mt-3 font-arserif text-2xl text-bone/92">{card.value}</h2>
              <p className="mt-3 font-arsans text-sm leading-6 text-bone/55">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="ui-kicker text-gold">Companion system</p>
            <h2 className="mt-2 font-arserif text-4xl text-bone/92">26 focused roles, not one chatbot costume.</h2>
            <p className="mt-4 font-arsans text-sm leading-7 text-bone/58">The roster is split between listening companions and builders. Every assistant message preserves the companion/avatar/world used when it was created.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <EvidenceStat label="Total personas" value={String(personas.length)} />
            <EvidenceStat label="Free" value={String(freeCount)} />
            <EvidenceStat label="Plus" value={String(plusCount)} />
          </div>
        </section>

        <section className="grid gap-10 py-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="ui-kicker text-gold">Demo keys</p>
            <h2 className="mt-2 font-arserif text-4xl text-bone/92">A judge can see the magic in four commands.</h2>
            <p className="mt-4 font-arsans text-sm leading-7 text-bone/58">These commands live inside Tools, but they also work directly in chat input for fast demo flow.</p>
          </div>
          <div className="space-y-3">
            {flows.map(([command, detail]) => (
              <article key={command} className="grid gap-3 border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-[8rem_1fr]">
                <p className="font-mono text-sm text-gold">{command}</p>
                <p className="font-arsans text-sm leading-6 text-bone/65">{detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function EvidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-gold/20 bg-gold/[0.025] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{label}</p>
      <p className="mt-3 font-enserif text-5xl italic text-gold">{value}</p>
    </article>
  );
}