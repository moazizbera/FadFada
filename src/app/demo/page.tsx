import Link from "next/link";
import { personas } from "../../lib/personas";

const evidenceCards = [
  { label: "Core", value: "Arabic-first reflection PWA", detail: "Chat, companions, Daily Pulse, saved moments, quests, and proof cards." },
  { label: "AI", value: "Gemini / Vertex ready", detail: "Reflection, storyboard prompts, avatar generation, and local fallbacks." },
  { label: "Admin", value: "Live operations room", detail: "Auto-refreshing visits, signups, comments, installs, sessions, gifts, and persona grants." },
  { label: "Trust", value: "Non-clinical wellbeing", detail: "No medical, legal, financial, emergency, or regulated claims." },
];

const flows = [
  { command: "/judge", title: "Judge run", detail: "Switches into the strongest end-to-end product demo.", proof: "Use first to frame the hackathon story." },
  { command: "/story", title: "Story Mirror", detail: "Turns a feeling into a compact symbolic scene.", proof: "Save it, then show the Profile gallery." },
  { command: "/proof", title: "Proof Card", detail: "Creates a share-ready before/after artifact.", proof: "Shows emotional value without exposing private chat." },
  { command: "/quest", title: "Growth Quest", detail: "Starts a tiny 3-day challenge from the conversation.", proof: "Then show the quest checklist in Profile." },
  { command: "/pitch", title: "Pitch Card", detail: "Generates a concise judge-facing product summary.", proof: "Useful when screen time is short." },
  { command: "/badge", title: "Believer Badge", detail: "Creates a launch/community artifact.", proof: "Shows shareability beyond the chat." },
];

const proofPaths = [
  { label: "Clean chat", href: "/", detail: "The main room stays focused on writing, voice, companions, and response actions." },
  { label: "Personal depth", href: "/profile", detail: "Journey map, companion memory, saved scenes, quests, snapshots, and billing live one layer down." },
  { label: "Operator truth", href: "/admin/dashboard", detail: "Admin keeps telemetry, gifts, persona grants, sessions, and live signals away from users." },
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

        <section className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="ui-kicker text-gold">Demo keys</p>
            <h2 className="mt-2 font-arserif text-4xl text-bone/92">A judge can see the magic without hunting for it.</h2>
            <p className="mt-4 font-arsans text-sm leading-7 text-bone/58">Each button opens the app and stages the command in chat. The presenter only presses Enter.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {flows.map((flow) => (
              <article key={flow.command} className="border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-gold">{flow.command}</p>
                    <h3 className="mt-2 font-arserif text-2xl text-bone/90">{flow.title}</h3>
                  </div>
                  <Link href={`/?demoCommand=${encodeURIComponent(flow.command)}`} className="ui-action border border-gold/30 px-3 py-2 text-gold hover:bg-gold hover:text-ink">Stage</Link>
                </div>
                <p className="mt-3 font-arsans text-sm leading-6 text-bone/65">{flow.detail}</p>
                <p className="mt-3 border-t border-white/10 pt-3 font-arsans text-xs leading-5 text-bone/42">{flow.proof}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-10 py-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="ui-kicker text-gold">Where the depth lives</p>
            <h2 className="mt-2 font-arserif text-4xl text-bone/92">Polish is layered, not piled onto the chat.</h2>
            <p className="mt-4 font-arsans text-sm leading-7 text-bone/58">This is the product structure to explain when someone asks why the interface feels calm while still being full-featured.</p>
          </div>
          <div className="space-y-3">
            {proofPaths.map((path) => (
              <Link key={path.href} href={path.href} className="block border border-gold/15 bg-gold/[0.025] p-4 transition-colors hover:border-gold/45">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-gold/70">{path.label}</p>
                <p className="mt-2 font-arsans text-sm leading-6 text-bone/65">{path.detail}</p>
              </Link>
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