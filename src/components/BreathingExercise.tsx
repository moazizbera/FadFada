"use client";

import { useEffect, useRef, useState } from "react";

type Language = "ar" | "en";

type BreathingExerciseProps = {
  language: Language;
  onClose: () => void;
};

const breathingPatterns = [
  { inhale: 4, hold: 0, exhale: 4, nameAr: "تنفس بسيط", nameEn: "Simple breath" },
  { inhale: 4, hold: 4, exhale: 4, nameAr: "تنفس مربع", nameEn: "Box breathing" },
  { inhale: 4, hold: 7, exhale: 8, nameAr: "تنفس الصوت", nameEn: "Relaxing breath" },
];

export function BreathingExercise({ language, onClose }: BreathingExerciseProps) {
  const isArabic = language === "ar";
  const [patternIndex, setPatternIndex] = useState(0);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "ready">("ready");
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [cycle, setCycle] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pattern = breathingPatterns[patternIndex];
  const totalCycleTime = pattern.inhale + pattern.hold + pattern.exhale;
  const totalCycles = 5;

  useEffect(() => {
    if (!isActive) return;

    let elapsed = 0;
    setPhase("inhale");
    setTimer(pattern.inhale);
    setCycle(1);

    intervalRef.current = setInterval(() => {
      elapsed++;

      const currentTimeInCycle = elapsed % totalCycleTime;
      const currentCycle = Math.floor(elapsed / totalCycleTime) + 1;

      setCycle(currentCycle);

      if (currentTimeInCycle < pattern.inhale) {
        setPhase("inhale");
        setTimer(pattern.inhale - currentTimeInCycle);
      } else if (currentTimeInCycle < pattern.inhale + pattern.hold) {
        setPhase("hold");
        setTimer(pattern.inhale + pattern.hold - currentTimeInCycle);
      } else {
        setPhase("exhale");
        setTimer(totalCycleTime - currentTimeInCycle);
      }

      if (currentCycle > totalCycles) {
        clearInterval(intervalRef.current!);
        setIsActive(false);
        setPhase("ready");
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, pattern, totalCycleTime]);

  const getScale = () => {
    if (!isActive || phase === "ready") return 1;
    if (phase === "inhale") return 1.5;
    if (phase === "hold") return 1.5;
    return 1;
  };

  const getPhaseLabel = () => {
    if (phase === "ready") return isArabic ? "جاهز؟" : "Ready?";
    if (phase === "inhale") return isArabic ? "استنشق" : "Breathe in";
    if (phase === "hold") return isArabic ? "احبس" : "Hold";
    return isArabic ? "زفر" : "Breathe out";
  };

  const getPhaseColor = () => {
    if (phase === "inhale") return "from-blue-400/40 to-cyan-400/40";
    if (phase === "hold") return "from-amber-400/40 to-yellow-400/40";
    return "from-green-400/40 to-emerald-400/40";
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#0E0D10]/98 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-lg" role="dialog" aria-modal="true" aria-label={isArabic ? "تمرين التنفس" : "Breathing exercise"} dir={isArabic ? "rtl" : "ltr"}>
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/[0.08] text-bone/75 shadow-2xl transition-all hover:bg-white/[0.12] hover:text-bone"
        aria-label={isArabic ? "إغلاق تمرين التنفس" : "Close breathing exercise"}
      >
        ✕
      </button>

      {/* Pattern selector */}
      <div className="mb-8 flex gap-2">
        {breathingPatterns.map((p, i) => (
          <button
            key={p.nameEn}
            type="button"
            onClick={() => {
              setPatternIndex(i);
              setIsActive(false);
              setPhase("ready");
            }}
            className={`rounded-full px-4 py-2 font-arsans text-xs transition-all ${
              i === patternIndex
                ? "bg-amber-200/20 text-amber-100 border border-amber-200/30"
                : "bg-white/[0.04] text-bone/50 border border-white/10 hover:bg-white/[0.08]"
            }`}
          >
            {isArabic ? p.nameAr : p.nameEn}
          </button>
        ))}
      </div>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center">
        {/* Outer rings */}
        <div className="absolute h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute h-52 w-52 rounded-full border border-white/10" />

        {/* Main circle */}
        <div
          className={`flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br transition-all duration-1000 ${getPhaseColor()} shadow-[0_0_60px_rgba(201,168,106,0.15)]`}
          style={{
            transform: `scale(${getScale()})`,
            transitionDuration: phase === "inhale" ? `${pattern.inhale}s` : phase === "exhale" ? `${pattern.exhale}s` : "0.5s",
          }}
        >
          <div className="text-center">
            <p className="font-arsans text-lg font-bold text-bone/90">{getPhaseLabel()}</p>
            {isActive && (
              <p className="mt-1 font-arsans text-3xl font-bold text-amber-100">{timer}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cycle counter */}
      {isActive && (
        <p className="mt-6 font-arsans text-sm text-bone/50">
          {isArabic ? "الدورة" : "Cycle"} {Math.min(cycle, totalCycles)} / {totalCycles}
        </p>
      )}

      {/* Start/Stop button */}
      <button
        type="button"
        onClick={() => {
          setIsActive(!isActive);
          if (isActive) {
            setPhase("ready");
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }}
        className="mt-8 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 px-8 py-3 font-arsans text-sm font-bold text-[#0E0D10] shadow-[0_8px_32px_rgba(201,168,106,0.3)] transition-all hover:shadow-[0_12px_40px_rgba(201,168,106,0.4)] hover:brightness-110 active:scale-95"
      >
        {isActive
          ? isArabic
            ? "إيقاف"
            : "Stop"
          : isArabic
          ? "ابدأ"
          : "Start"}
      </button>

      {/* Pattern info */}
      <p className="mt-4 font-arsans text-xs text-bone/35">
        {pattern.inhale}-{pattern.hold > 0 ? `${pattern.hold}-` : ""}{pattern.exhale}{" "}
        {isArabic ? "ثواني" : "seconds"}
      </p>
    </div>
  );
}
