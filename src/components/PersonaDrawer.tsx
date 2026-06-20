"use client";

import Image from "next/image";
import { personas, type Persona, type PersonaId } from "../lib/personas";

type Language = "ar" | "en";

type PersonaDrawerProps = {
  open: boolean;
  activePersona: PersonaId;
  language: Language;
  onClose: () => void;
  onSelect: (personaId: PersonaId) => void;
};

const personaAvatarPaths: Record<PersonaId, string> = {
  omar: "/avatars/omar.png",
  sami: "/avatars/sami.png",
  nora: "/avatars/nora.png",
};

function getPersonaDisplayName(persona: Persona, language: Language) {
  return language === "ar" ? persona.nameAr : persona.name;
}

export function PersonaDrawer({ open, activePersona, language, onClose, onSelect }: PersonaDrawerProps) {
  return (
    <div className={`fixed inset-0 z-40 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button type="button" aria-label="Close persona drawer" onClick={onClose} className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <section
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-[2rem] border-t border-white/10 bg-[#0E0D10]/95 p-5 shadow-2xl backdrop-blur-2xl transition-transform duration-500 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-ensans text-[10px] uppercase tracking-[0.14em] text-bone/40">choose companion</p>
          <button type="button" onClick={onClose} className="font-ensans text-xs text-bone/50 transition-colors hover:text-[#C9A86A]">
            close
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {personas.map((persona) => {
            const selected = activePersona === persona.id;
            const displayName = getPersonaDisplayName(persona, language);
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => {
                  onSelect(persona.id);
                  onClose();
                }}
                className={`group text-start transition-opacity ${selected ? "opacity-100" : "opacity-65 hover:opacity-95"}`}
                aria-pressed={selected}
                aria-label={`Choose ${persona.name}`}
              >
                <span
                  className={`relative block aspect-[4/5] overflow-hidden rounded-3xl border bg-slate-950 shadow-xl transition-colors ${
                    selected ? "border-[#C9A86A]/80" : "border-white/10"
                  }`}
                >
                  <Image src={personaAvatarPaths[persona.id]} alt={`${persona.name} avatar`} fill sizes="(max-width: 768px) 30vw, 180px" className="object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/72 to-transparent px-3 pb-3 pt-8">
                    <span className={`block truncate text-center text-sm text-bone/90 ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{displayName}</span>
                  </span>
                </span>
                <span className="mt-2 block truncate text-center font-ensans text-[10px] uppercase tracking-[0.08em] text-bone/40">{persona.role}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}