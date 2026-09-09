"use client";

import { useCallback, useRef } from "react";

type Language = "ar" | "en";

type ChildMusicActivityProps = {
  language: Language;
  onClose: () => void;
};

const NOTES = [
  { freq: 261.63, name: "Do", color: "#FF4D4D" },
  { freq: 293.66, name: "Re", color: "#FF8C42" },
  { freq: 329.63, name: "Mi", color: "#FFD23F" },
  { freq: 349.23, name: "Fa", color: "#6BCB77" },
  { freq: 392.0, name: "Sol", color: "#4D96FF" },
  { freq: 440.0, name: "La", color: "#9B59B6" },
  { freq: 493.88, name: "Si", color: "#FF6B9D" },
  { freq: 523.25, name: "Do", color: "#00CEC9" },
];

export default function ChildMusicActivity({ language, onClose }: ChildMusicActivityProps) {
  const isArabic = language === "ar";
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNote = useCallback((freq: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-[4.75rem] top-0 z-[80] flex flex-col overflow-hidden bg-gradient-to-b from-[#1A1040] to-[#0E0D10]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-black/30 px-3 py-2 font-arsans text-sm font-bold text-[#F7F3EC]/80 hover:border-[#F7F3EC]/35 hover:text-[#F7F3EC]"
          aria-label={isArabic ? "رجوع" : "Back"}
        >
          {isArabic ? "→ رجوع" : "← Back"}
        </button>
        <h2 className="font-arsans text-lg font-bold text-[#F7F3EC]/90">
          {isArabic ? "🎵 بيانو الألوان" : "🎵 Color Piano"}
        </h2>
        <div className="w-20" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4">
        <p className="font-arsans text-center text-sm text-[#F7F3EC]/70">
          {isArabic ? "اضغط على المفاتيح الملونة لعزف ألحانك!" : "Tap the colored keys to play your melody!"}
        </p>

        <div className="flex w-full max-w-lg items-end gap-1.5 px-2" dir="ltr">
          {NOTES.map((note) => (
            <button
              key={note.freq}
              type="button"
              onMouseDown={() => playNote(note.freq)}
              onTouchStart={(e) => {
                e.preventDefault();
                playNote(note.freq);
              }}
              className="group relative flex-1 cursor-pointer touch-none select-none rounded-t-xl border border-white/15 transition-all active:scale-y-[0.97] active:brightness-125"
              style={{
                backgroundColor: `${note.color}22`,
                borderBottom: `4px solid ${note.color}`,
                height: `${120 + (note.freq - 261.63) * 0.25}px`,
                minHeight: "80px",
              }}
              aria-label={note.name}
            >
              <span
                className="absolute inset-x-0 bottom-2 text-center font-arsans text-[10px] font-bold opacity-60 transition-opacity group-hover:opacity-100"
                style={{ color: note.color }}
              >
                {note.name}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 font-arsans text-sm font-bold text-[#F7F3EC]/80 hover:bg-white/[0.12] hover:text-[#F7F3EC]"
        >
          {isArabic ? "→ رجوع للقائمة الرئيسية" : "← Back to main menu"}
        </button>
      </div>
    </div>
  );
}
