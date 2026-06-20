"use client";

import { FormEvent, useMemo, useState } from "react";
import { reflectLocally, rerenderWorld, type EngineMessage } from "@/lib/localEngine";
import type { LearningResource } from "@/lib/research";
import { getWorld, type WorldId } from "@/lib/worlds";
import { EvidenceRoom } from "./EvidenceRoom";
import { ModeBadge } from "./ModeBadge";
import { PresenceOrb } from "./PresenceOrb";
import { ResourceList } from "./ResourceList";
import { TypewriterText } from "./TypewriterText";
import { WorldCanvas } from "./WorldCanvas";
import { WorldShift } from "./WorldShift";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  worldId: WorldId;
  resources?: LearningResource[];
  safetyTriggered?: boolean;
};

const openingMessage: Message = {
  id: "opening",
  role: "assistant",
  worldId: "calm",
  text: "اكتب اللي جواك بأي لغة. أنا هنا أسمعك بهدوء، وبعدها نطلع بخطوة صغيرة واضحة.",
};

const worldFontClass: Record<WorldId, string> = {
  calm: "font-arsans",
  story: "font-enserif italic",
  poetry: "font-enserif",
  faith: "font-arserif",
  learning: "font-arsans",
  build: "font-mono",
  celebration: "font-arsans",
  grief: "font-arsans",
};

export function ConversationRoom() {
  const [messages, setMessages] = useState<Message[]>([openingMessage]);
  const [input, setInput] = useState("");
  const [currentWorldId, setCurrentWorldId] = useState<WorldId>("calm");
  const [isThinking, setIsThinking] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const currentWorld = getWorld(currentWorldId);
  const hasUserMessage = messages.some((message) => message.role === "user");

  const latestUserText = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
  }, [messages]);

  const worldsVisited = useMemo(() => {
    return Array.from(new Set(messages.map((message) => message.worldId)));
  }, [messages]);

  const safetyEvents = messages.filter((message) => message.safetyTriggered).length;
  const resourceEvents = messages.filter((message) => message.resources?.length).length;

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    const history = toEngineMessages(messages);
    const result = reflectLocally(text, history);
    const worldId = result.worldId;
    setCurrentWorldId(worldId);
    setIsThinking(true);
    setInput("");

    window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "user", text, worldId },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.text,
          worldId,
          resources: result.resources,
          safetyTriggered: result.safetyTriggered,
        },
      ]);
      setIsThinking(false);
    }, 420);
  }

  function shiftWorld(worldId: WorldId) {
    if (!latestUserText || isThinking) return;

    setCurrentWorldId(worldId);
    setIsThinking(true);
    const result = rerenderWorld(worldId, toEngineMessages(messages));

    window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.text,
          worldId,
          resources: result.resources,
        },
      ]);
      setIsThinking(false);
    }, 520);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-bone transition-[background] duration-[1200ms]" style={{ background: currentWorld.gradient }}>
      <WorldCanvas world={currentWorld} />
      <div className="relative z-10 flex min-h-dvh flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between text-bone">
          <span className="font-enserif text-2xl italic text-bone/55">Fadfada</span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setEvidenceOpen((open) => !open)} className="font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35 transition-colors hover:text-gold">
              Evidence
            </button>
            <span className="font-arserif text-3xl text-bone/95">فضفضة</span>
          </div>
        </header>

        <section className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-center gap-3">
          <PresenceOrb world={currentWorld} thinking={isThinking} />
          <ModeBadge world={currentWorld} />
          <WorldShift currentWorld={currentWorldId} disabled={!hasUserMessage || isThinking} onShift={shiftWorld} />
        </section>

        <EvidenceRoom
          open={evidenceOpen}
          sessions={hasUserMessage ? 1 : 0}
          messages={Math.max(0, messages.length - 1)}
          safetyEvents={safetyEvents}
          resourceEvents={resourceEvents}
          worldsVisited={worldsVisited}
        />

        <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 overflow-y-auto py-10 text-right" aria-live="polite">
          {messages.map((message) => {
            const world = getWorld(message.worldId);
            const fontClass = worldFontClass[message.worldId];
            const isUser = message.role === "user";

            return (
              <article key={message.id} className="space-y-3" dir="auto">
                {isUser ? (
                  <div className="ml-auto max-w-[42rem]">
                    <p className="font-arsans text-lg leading-[1.9] text-bone/95">{message.text}</p>
                    <span className="mt-3 block h-px w-7 bg-gold/40" />
                  </div>
                ) : (
                  <div className="max-w-[42rem]">
                    <TypewriterText className={`${fontClass} text-lg leading-[1.9] text-bone/80`} speed={world.typeSpeed} text={message.text} />
                    {message.resources ? <ResourceList resources={message.resources} /> : null}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <form onSubmit={sendMessage} className="mx-auto flex w-full max-w-2xl items-end gap-3 border-t border-line py-4">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="فضفض هنا..."
            rows={1}
            className="min-h-12 flex-1 resize-none border-0 bg-transparent font-arsans text-lg leading-[1.9] text-bone/95 outline-none placeholder:text-bone/30"
            dir="auto"
          />
          <button type="submit" className="pb-2 font-mono text-xs uppercase tracking-[0.08em] text-gold transition-colors hover:text-bone">
            ابعت
          </button>
        </form>
      </div>
    </main>
  );
}

function toEngineMessages(messages: Message[]): EngineMessage[] {
  return messages.map((message) => ({ role: message.role, text: message.text, worldId: message.worldId }));
}
