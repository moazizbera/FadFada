"use client";

import Image from "next/image";
import { personas, type Persona, type PersonaId } from "../lib/personas";

type Language = "ar" | "en";

type PersonaDrawerProps = {
  open: boolean;
  activePersona: PersonaId;
  language: Language;
  unlockedPersonaIds: PersonaId[];
  onClose: () => void;
  onSelect: (personaId: PersonaId) => void;
  onLockedPersonaSelect: (personaId: PersonaId) => void;
};

const avatarFrameClass = "relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-[#0E0D10] shadow-2xl";

function getPersonaDisplayName(persona: Persona, language: Language) {
  return language === "ar" ? persona.nameAr : persona.nameEn;
}

function getPersonaRole(persona: Persona, language: Language) {
  return language === "ar" ? persona.roleAr : persona.roleEn;
}

function LockIcon() {
  return (
    <svg className="h-6 w-6 text-[#C9A86A]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.75 10.5V8.25C7.75 5.9 9.65 4 12 4s4.25 1.9 4.25 4.25v2.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6.5 10.5h11A1.5 1.5 0 0 1 19 12v5.5A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5V12a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 14v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function PersonaDrawer({ open, activePersona, language, unlockedPersonaIds, onClose, onSelect, onLockedPersonaSelect }: PersonaDrawerProps) {
  const personaCards = personas.map((persona) => ({
    persona,
    displayName: getPersonaDisplayName(persona, language),
    role: getPersonaRole(persona, language),
    locked: Boolean(persona.isPremium && !unlockedPersonaIds.includes(persona.id)),
    selected: activePersona === persona.id,
  }));

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
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {personaCards.map(({ persona, displayName, role, locked, selected }) => {
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => {
                  if (locked) {
                    onLockedPersonaSelect(persona.id);
                    return;
                  }

                  onSelect(persona.id);
                  onClose();
                }}
                className={`group text-start transition duration-300 ${selected ? "scale-[1.03] opacity-100" : "opacity-70 hover:scale-[1.02] hover:opacity-95"}`}
                aria-pressed={selected}
                aria-label={locked ? `Unlock ${persona.nameEn}` : `Choose ${persona.nameEn}`}
              >
                <span
                  className={`block ${avatarFrameClass} transition-all duration-500 ${
                    selected ? "animate-breathe border-white/20" : ""
                  }`}
                  style={selected ? { boxShadow: `0 0 0 1px rgba(255,255,255,0.1), 0 22px 52px ${persona.glowColorHex}4D` } : undefined}
                >
                  <Image
                    src={persona.avatarPath}
                    alt={`${persona.nameEn} avatar`}
                    fill
                    sizes="(max-width: 768px) 30vw, 180px"
                    className={`object-cover transition duration-500 ${locked ? "filter grayscale contrast-50 brightness-40 opacity-30" : ""}`}
                  />
                  {locked ? <span className="absolute inset-0 filter grayscale contrast-50 brightness-40 opacity-30" aria-hidden="true" /> : null}
                  {locked ? (
                    <span className="absolute inset-0 grid place-items-center bg-[#0E0D10]/20">
                      <LockIcon />
                    </span>
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/72 to-transparent px-3 pb-3 pt-8">
                    <span className={`block truncate text-center text-sm text-bone/90 ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{displayName}</span>
                  </span>
                </span>
                <span className={`mt-2 block truncate text-center text-[10px] uppercase tracking-[0.08em] text-bone/40 ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{role}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}