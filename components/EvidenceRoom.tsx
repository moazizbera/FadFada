"use client";

import type { WorldId } from "@/lib/worlds";

type EvidenceRoomProps = {
  open: boolean;
  sessions: number;
  messages: number;
  safetyEvents: number;
  resourceEvents: number;
  worldsVisited: WorldId[];
};

export function EvidenceRoom({ open, sessions, messages, safetyEvents, resourceEvents, worldsVisited }: EvidenceRoomProps) {
  if (!open) return null;

  const evidence = {
    generatedAt: new Date().toISOString(),
    sessions,
    messages,
    safetyEvents,
    resourceEvents,
    worldsVisited,
    pwaReady: Boolean(typeof navigator !== "undefined" && "serviceWorker" in navigator),
    geminiReady: false,
    fallbackReady: true,
  };

  function exportEvidence() {
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fadfada-evidence.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mx-auto mt-5 w-full max-w-2xl border-y border-line py-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Sessions" value={sessions} />
        <Metric label="Messages" value={messages} />
        <Metric label="Safety" value={safetyEvents} />
        <Metric label="Resources" value={resourceEvents} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">
          Worlds: {worldsVisited.length ? worldsVisited.join(" / ") : "calm"} · fallback ready · pwa shell ready
        </p>
        <button type="button" onClick={exportEvidence} className="rounded-md bg-gold px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-bone">
          Export JSON
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line bg-bone/[0.03] px-3 py-2">
      <span className="block font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{label}</span>
      <span className="mt-1 block font-mono text-lg text-bone/85">{value}</span>
    </div>
  );
}
