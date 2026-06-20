"use client";

import Image from "next/image";
import { FormEvent, useMemo, useRef, useState } from "react";
import { personas, type PersonaId } from "../lib/personas";
import { selectableWorlds, worlds, type WorldId } from "../lib/worlds";
import { PersonaDrawer } from "./PersonaDrawer";
import { TypewriterSync, type EmotionalCadence } from "./TypewriterSync";

type Language = "ar" | "en";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  world: WorldId;
  language?: Language;
  cadence?: EmotionalCadence;
};

type ReflectResponse = {
  text?: string;
  world?: WorldId;
  emotionalCadence?: {
    speed?: EmotionalCadence;
  };
  error?: "PAYWALL_TRIGGERED" | string;
  promptUpsell?: boolean;
  message?: string;
};

const worldLabels: Record<WorldId, string> = {
  story: "حكاية",
  faith: "إيمان",
  build: "بناء",
  calm: "هادئ",
  learning: "تعلم",
  celebration: "فرح",
  grief: "سكينة",
};

const userId = "local-demo-user";

const personaAvatarPaths: Record<PersonaId, string> = {
  omar: "/avatars/omar.png",
  sami: "/avatars/sami.png",
  nora: "/avatars/nora.png",
};

function getPersonaDisplayName(persona: { name: string; nameAr: string }, activeLanguage: Language) {
  return activeLanguage === "ar" ? persona.nameAr : persona.name;
}

export function ChatWindow() {
  const [world, setWorld] = useState<WorldId>("calm");
  const [language, setLanguage] = useState<Language>("ar");
  const [personaId, setPersonaId] = useState<PersonaId>("omar");
  const [personaOpen, setPersonaOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "opening",
      role: "assistant",
      text: "اكتب اللي جواك بأي لغة. أنا هنا أسمعك بهدوء، وبعدها نطلع بخطوة صغيرة واضحة.",
      world: "calm",
      language: "ar",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const activeWorld = worlds[world];
  const activePersona = useMemo(() => personas.find((persona) => persona.id === personaId) ?? personas[0], [personaId]);
  const activePersonaAvatarPath = personaAvatarPaths[personaId];
  const activePersonaDisplayName = getPersonaDisplayName(activePersona, language);

  async function submitMessage(event?: FormEvent<HTMLFormElement>, overrideText?: string) {
    event?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || isThinking) return;

    const nextLanguage = inferRequestedLanguage(text);
    setLanguage(nextLanguage);
    setInput("");
    setIsThinking(true);
    setPaywallOpen(false);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      world,
      language: nextLanguage,
    };
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, messageText: text, currentWorld: world, currentLanguage: nextLanguage, recentMessages: buildRecentMessages(messages) }),
      });
      const data = (await response.json()) as ReflectResponse;

      if (data.error === "PAYWALL_TRIGGERED" || data.promptUpsell) {
        setPaywallOpen(true);
        return;
      }

      const responseWorld = data.world && data.world in worlds ? data.world : world;
      const cadence = normalizeCadence(data.emotionalCadence?.speed, responseWorld);
      setWorld(responseWorld);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.text || (nextLanguage === "ar" ? "أنا معاك. خلينا نكمل بخطوة صغيرة." : "I am with you. Let's continue with one small step."),
          world: responseWorld,
          language: nextLanguage,
          cadence,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: nextLanguage === "ar" ? "حصل انقطاع بسيط. جرّب تكتبها تاني بهدوء." : "Something briefly disconnected. Try writing it again calmly.",
          world,
          language: nextLanguage,
          cadence: normalizeCadence(undefined, world),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  async function toggleVoiceCapture() {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        void submitMessage(undefined, "[Voice Reflection Captured]");
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      void submitMessage(undefined, "[Voice Reflection Captured]");
    }
  }

  async function startCheckout() {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
        currentLanguage: language,
      }),
    });
    const data = (await response.json()) as { url?: string };

    if (data.url) {
      window.location.assign(data.url);
      return;
    }

    window.location.assign("/api/checkout");
  }

  return (
    <main
      className="relative mx-auto flex min-h-screen max-w-2xl flex-col overflow-hidden bg-[#0E0D10] px-4 pb-24 pt-6 text-[#F7F3EC]/90 transition-[background] duration-1000"
      style={{ background: activeWorld.gradient }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(247,243,236,0.08),transparent_22rem)]" />

      <header className="relative z-10 flex min-h-16 items-center justify-between">
        <span className="font-enserif text-2xl italic text-[#F7F3EC]/40">Fadfada</span>
        <button
          type="button"
          onClick={() => setPersonaOpen(true)}
          className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center gap-1.5 text-center outline-none"
          aria-label={`Open persona drawer for ${activePersona.name}`}
        >
          <span
            className={`relative h-12 w-12 overflow-hidden rounded-3xl border bg-slate-950 shadow-xl transition-all duration-500 ${
              isThinking ? "animate-pulse border-[#C9A86A] shadow-[0_0_28px_rgba(201,168,106,0.32)]" : "animate-breathe border-white/10 duration-[4000ms]"
            }`}
          >
            <Image
              src={activePersonaAvatarPath}
              alt={`${activePersona.name} avatar`}
              fill
              sizes="48px"
              priority
              className="object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 to-transparent px-1 pb-1 pt-4">
              <span className={`block truncate text-center text-[10px] leading-none text-bone/90 ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{activePersonaDisplayName}</span>
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-bone/90">
            <span className={language === "ar" ? "font-arsans" : "font-ensans"}>{activePersonaDisplayName}</span>
          </span>
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPersonaOpen(true)}
            className="font-mono text-[10px] tracking-[0.08em] text-[#F7F3EC]/35 transition-colors hover:text-[#C9A86A]"
          >
            [الرفيق / Persona]
          </button>
          <span className="font-arserif text-3xl text-[#F7F3EC]/95">فضفضة</span>
        </div>
      </header>

      <section className="relative z-10 mt-8 flex flex-col items-center">
        <PresenceOrb world={world} color={activeWorld.orbHex} />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#F7F3EC]/35">{activeWorld.nameEn}</p>
        <WorldShiftRow world={world} onWorldChange={setWorld} />
      </section>

      <section
        className={`relative z-10 mx-auto mt-8 flex w-full max-w-[42rem] flex-1 flex-col gap-8 overflow-y-auto text-right transition-opacity duration-500 ${
          paywallOpen ? "opacity-20" : "opacity-100"
        }`}
      >
        {messages.map((message) => (
          <article key={message.id} className="animate-rise-in text-right" dir="auto">
            {message.role === "user" ? (
              <div>
                <p className="font-arsans text-lg leading-[1.9] text-[#F7F3EC]/95">{message.text}</p>
                <span className="mt-3 block h-px w-7 bg-[#C9A86A]/70" />
              </div>
            ) : (
              <TypewriterSync text={message.text} language={message.language || language} cadence={message.cadence || normalizeCadence(undefined, message.world)} />
            )}
          </article>
        ))}
        {isThinking ? <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#F7F3EC]/30">{activePersona.name} is listening...</p> : null}
      </section>

      {paywallOpen ? <PaywallCard onCheckout={startCheckout} /> : null}

      <form onSubmit={submitMessage} className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-2xl items-end gap-3 px-4 pb-5 pt-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={toggleVoiceCapture}
          className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#F7F3EC]/10 bg-[#F7F3EC]/[0.03] font-mono text-sm text-[#C9A86A] ${
            isRecording ? "shadow-[0_0_0_6px_rgba(201,168,106,0.16)]" : ""
          }`}
          aria-label="Capture voice reflection"
        >
          <span className={isRecording ? "absolute inset-0 rounded-full border border-[#C9A86A]/60 animate-ping" : "hidden"} />
          <span className="h-2.5 w-2.5 rounded-full bg-[#C9A86A]" aria-hidden="true" />
        </button>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={1}
          dir="auto"
          placeholder={language === "ar" ? "فضفض هنا..." : "Write freely..."}
          className="min-h-12 flex-1 border-0 bg-transparent font-arsans text-lg leading-[1.9] text-[#F7F3EC]/95 outline-none placeholder:text-[#F7F3EC]/25"
        />
        <button type="submit" className="pb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#C9A86A] transition-colors hover:text-[#F7F3EC]">
          ابعت
        </button>
      </form>

      <PersonaDrawer open={personaOpen} activePersona={personaId} language={language} onClose={() => setPersonaOpen(false)} onSelect={setPersonaId} />
    </main>
  );
}

function buildRecentMessages(messages: ChatMessage[]) {
  return messages.slice(-8).map((message) => ({
    role: message.role,
    text: message.text,
    world: message.world,
    language: message.language,
  }));
}

function normalizeCadence(value: EmotionalCadence | undefined, world: WorldId): EmotionalCadence {
  if (value === "slow_reflective" || value === "rapid_energetic" || value === "steady_calm") {
    return value;
  }

  if (world === "faith" || world === "grief" || world === "story") {
    return "slow_reflective";
  }

  if (world === "build" || world === "celebration") {
    return "rapid_energetic";
  }

  return "steady_calm";
}

function inferRequestedLanguage(text: string): Language {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/\b(arabic|arabiyyah|عربي|العربية|بالعربي|arabic story|arabic poem)\b/i.test(text)) return "ar";
  return "en";
}

function PresenceOrb({ world, color }: { world: WorldId; color: string }) {
  return (
    <div className="relative grid h-20 w-20 place-items-center" style={{ ["--orb-glow" as string]: `${color}66` }}>
      <div className="absolute h-16 w-16 rounded-full blur-2xl" style={{ backgroundColor: color, opacity: 0.35 }} />
      <svg className="animate-breathe relative h-20 w-20" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="orb-fill" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.18" />
          </radialGradient>
        </defs>
        {world === "story" ? <path d="M50 14 C35 34 25 46 25 63 C25 81 38 91 50 91 C62 91 75 81 75 63 C75 46 65 34 50 14 Z" fill="url(#orb-fill)" /> : null}
        {world === "faith" ? <path d="M65 20 A35 35 0 1 0 65 80 A27 27 0 1 1 65 20 Z" fill={color} opacity="0.82" /> : null}
        {world === "build" ? <path d="M50 10 L58 42 L90 50 L58 58 L50 90 L42 58 L10 50 L42 42 Z" fill="url(#orb-fill)" /> : null}
        {world !== "story" && world !== "faith" && world !== "build" ? <circle cx="50" cy="50" r="28" fill="url(#orb-fill)" /> : null}
      </svg>
    </div>
  );
}

function WorldShiftRow({ world, onWorldChange }: { world: WorldId; onWorldChange: (world: WorldId) => void }) {
  return (
    <div className="mt-4 flex w-full max-w-md gap-2 overflow-x-auto px-2 [scrollbar-width:none]">
      {selectableWorlds.map((worldId) => {
        const active = worldId === world;
        return (
          <button
            key={worldId}
            type="button"
            onClick={() => onWorldChange(worldId)}
            className={`shrink-0 rounded-full px-3 py-1.5 font-arsans text-xs transition-colors ${
              active ? "bg-[#C9A86A]/15 text-[#C9A86A]" : "text-[#F7F3EC]/45 hover:text-[#F7F3EC]/80"
            }`}
          >
            {worldLabels[worldId]}
          </button>
        );
      })}
    </div>
  );
}

function PaywallCard({ onCheckout }: { onCheckout: () => void }) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-center px-6">
      <div className="animate-rise-in w-full max-w-sm rounded-2xl border border-[#C9A86A]/25 bg-[#0E0D10]/90 p-5 text-center shadow-2xl backdrop-blur-2xl">
        <p className="font-enserif text-2xl italic text-[#F7F3EC]/90">Premium deep-dives</p>
        <p className="mt-3 font-arsans text-sm leading-7 text-[#F7F3EC]/60">Free reflection limit reached. Unlock focused Gemini-powered responses, memory-aware plans, and deeper learning routes.</p>
        <button type="button" onClick={onCheckout} className="mt-5 w-full rounded-full bg-[#C9A86A] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
          Unlock 10 Premium Deep-Dives ($4.99)
        </button>
      </div>
    </div>
  );
}
