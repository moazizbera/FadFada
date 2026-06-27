"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

const guidedSequence = [
  { step: "01", title: "Open with the judge run", href: "/?demoCommand=%2Fjudge", detail: "Frame the product, trust boundaries, AI stack, and user value." },
  { step: "02", title: "Stage Story Mirror", href: "/?demoCommand=%2Fstory", detail: "Show emotional imagination without making the chat visually busy." },
  { step: "03", title: "Reveal personal depth", href: "/profile", detail: "Open Journey Map, mood constellation, companion memory, voice studio, and saved galleries." },
  { step: "04", title: "Prove operations", href: "/admin/dashboard", detail: "Show live room, narrative timeline, sessions, gifts, grants, and admin controls." },
];

const snapshotFacts = [
  "Arabic-first bilingual emotional reflection PWA",
  "26 focused companions with Plus unlocks and grants",
  "Gemini / Vertex reflection, storyboard prompt, avatar, and fallback-ready AI stack",
  "Profile journey map, mood constellation, story gallery, quests, and voice studio",
  "Admin live room, narrative timeline, sessions, gifts, persona grants, offers, and notifications",
  "Non-clinical wellbeing boundaries with no emergency, medical, legal, or financial claims",
];

const pitchBeats = [
  { label: "Problem", text: "Arabic speakers often get generic AI answers that miss emotional tone, privacy, and cultural warmth." },
  { label: "Solution", text: "FadFada turns a private vent into reflection, a small step, and optional artifacts without becoming clinical." },
  { label: "Product", text: "Clean chat first; Profile holds growth memory; Admin holds proof, operations, gifts, and grants." },
  { label: "Moat", text: "Persona continuity, Arabic voice polish, Story Mirror artifacts, and low-clutter emotional UX." },
  { label: "Ask", text: "Judge the product by emotional clarity, demo readiness, safety boundaries, and Arabic-first execution." },
];

export default function DemoEvidencePage() {
  const freeCount = personas.filter((persona) => !persona.isPremium).length;
  const plusCount = personas.length - freeCount;
  const [demoCommand, setDemoCommand] = useState("/story");
  const [demoLanguage, setDemoLanguage] = useState("ar");
  const [demoPersona, setDemoPersona] = useState("rawi");
  const demoHref = useMemo(() => `/?demoCommand=${encodeURIComponent(demoCommand)}&lang=${demoLanguage}&persona=${demoPersona}`, [demoCommand, demoLanguage, demoPersona]);

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
            <button type="button" onClick={() => window.print()} className="ui-action border border-cyan-200/30 px-4 py-3 text-cyan-100 hover:bg-cyan-200 hover:text-ink">Print snapshot</button>
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
            <p className="ui-kicker text-gold">Guided autopilot</p>
            <h2 className="mt-2 font-arserif text-4xl text-bone/92">A clean route through the whole product.</h2>
            <p className="mt-4 font-arsans text-sm leading-7 text-bone/58">Browsers should not auto-drive private interactions, so this gives presenters a one-click sequence that stays controlled and demo-safe.</p>
          </div>
          <div className="space-y-3">
            {guidedSequence.map((item) => (
              <Link key={item.step} href={item.href} className="grid gap-3 border border-white/10 bg-white/[0.025] p-4 transition-colors hover:border-gold/45 sm:grid-cols-[3rem_1fr_auto]">
                <span className="font-enserif text-3xl italic text-gold">{item.step}</span>
                <span>
                  <span className="block font-arserif text-2xl text-bone/90">{item.title}</span>
                  <span className="mt-2 block font-arsans text-sm leading-6 text-bone/55">{item.detail}</span>
                </span>
                <span className="self-center font-mono text-[10px] uppercase tracking-[0.08em] text-gold/70">Open</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="snapshot" className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="ui-kicker text-gold">Judge snapshot</p>
            <h2 className="mt-2 font-arserif text-4xl text-bone/92">One page of proof when time is short.</h2>
            <p className="mt-4 font-arsans text-sm leading-7 text-bone/58">This section prints cleanly as the lightweight investor or judge leave-behind.</p>
          </div>
          <div className="border border-gold/20 bg-gold/[0.025] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-gold/70">FadFada / فضفضة</p>
            <h3 className="mt-3 font-arserif text-3xl text-bone/92">Calm Arabic AI for reflection, growth, and emotional artifacts.</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {snapshotFacts.map((fact) => (
                <p key={fact} className="border border-white/10 bg-black/10 p-3 font-arsans text-sm leading-6 text-bone/62">{fact}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="ui-kicker text-gold">Founder mode</p>
            <h2 className="mt-2 font-arserif text-4xl text-bone/92">Pitch rehearsal without opening another doc.</h2>
            <p className="mt-4 font-arsans text-sm leading-7 text-bone/58">A compact presenter script for the moments before a judge, investor, or teammate asks, “what is this really?”</p>
          </div>
          <div className="space-y-3">
            {pitchBeats.map((beat) => (
              <article key={beat.label} className="grid gap-3 border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-[7rem_1fr]">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-gold/70">{beat.label}</p>
                <p className="font-arsans text-sm leading-6 text-bone/65">{beat.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="ui-kicker text-gold">Shareable demo link</p>
            <h2 className="mt-2 font-arserif text-4xl text-bone/92">Build the exact route you want to show.</h2>
            <p className="mt-4 font-arsans text-sm leading-7 text-bone/58">Choose a command, language, and persona. The app opens with the command staged so the presenter presses Enter.</p>
          </div>
          <div className="border border-gold/20 bg-gold/[0.025] p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <DemoSelect label="Command" value={demoCommand} onChange={setDemoCommand} options={flows.map((flow) => flow.command)} />
              <DemoSelect label="Language" value={demoLanguage} onChange={setDemoLanguage} options={["ar", "en"]} />
              <DemoSelect label="Persona" value={demoPersona} onChange={setDemoPersona} options={["rawi", "omar", "malek", "mentor"]} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <Link href={demoHref} className="ui-action bg-gold px-4 py-3 text-ink hover:bg-bone">Open link</Link>
              <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${demoHref}`)} className="ui-action border border-white/15 px-4 py-3 text-bone/80 hover:border-gold/45 hover:text-gold">Copy link</button>
              <p className="min-w-0 break-all font-mono text-[10px] text-bone/35">{demoHref}</p>
            </div>
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

function DemoSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full border border-white/10 bg-ink px-3 py-3 font-mono text-xs text-bone outline-none focus:border-gold/50">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}