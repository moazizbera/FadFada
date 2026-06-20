"use client";

import { useEffect, useRef, useState } from "react";

export type EmotionalCadence = "slow_reflective" | "steady_calm" | "rapid_energetic";
export type TypewriterLanguage = "ar" | "en";

type TypewriterSyncProps = {
  text: string;
  cadence?: EmotionalCadence;
  language?: TypewriterLanguage;
  className?: string;
  onComplete?: () => void;
};

type Particle = {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  alpha: number;
  hue: number;
};

type CadenceProfile = {
  intervalMs: number;
  particleVelocity: number;
  particleCount: number;
  alpha: number;
  lineGlow: string;
};

const cadenceProfiles: Record<EmotionalCadence, CadenceProfile> = {
  slow_reflective: {
    intervalMs: 45,
    particleVelocity: 0.18,
    particleCount: 24,
    alpha: 0.22,
    lineGlow: "rgba(139, 123, 184, 0.34)",
  },
  steady_calm: {
    intervalMs: 28,
    particleVelocity: 0.34,
    particleCount: 34,
    alpha: 0.28,
    lineGlow: "rgba(201, 168, 106, 0.30)",
  },
  rapid_energetic: {
    intervalMs: 12,
    particleVelocity: 0.72,
    particleCount: 48,
    alpha: 0.36,
    lineGlow: "rgba(212, 114, 74, 0.34)",
  },
};

export function TypewriterSync({ text, cadence = "steady_calm", language = "ar", className = "", onComplete }: TypewriterSyncProps) {
  const [visibleText, setVisibleText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const completionRef = useRef(onComplete);

  completionRef.current = onComplete;
  const direction = language === "ar" ? "rtl" : "ltr";
  const profile = cadenceProfiles[cadence] || cadenceProfiles.steady_calm;

  useEffect(() => {
    setVisibleText("");
    setIsComplete(false);

    const characters = Array.from(formatTextForLanguage(text, language));
    if (characters.length === 0) {
      setIsComplete(true);
      completionRef.current?.();
      return;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(characters.slice(0, index).join(""));

      if (index >= characters.length) {
        window.clearInterval(timer);
        setIsComplete(true);
        completionRef.current?.();
      }
    }, profile.intervalMs);

    return () => window.clearInterval(timer);
  }, [text, language, profile.intervalMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeCanvas = canvas;

    const context = activeCanvas.getContext("2d");
    if (!context) return;
    const activeContext = context;

    let width = 0;
    let height = 0;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      const rect = activeCanvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      activeCanvas.width = Math.floor(width * pixelRatio);
      activeCanvas.height = Math.floor(height * pixelRatio);
      activeContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      particlesRef.current = createParticles(profile, width, height, language);
    }

    function render() {
      activeContext.clearRect(0, 0, width, height);
      const gradient = activeContext.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(247, 243, 236, 0.02)");
      gradient.addColorStop(1, profile.lineGlow);
      activeContext.fillStyle = gradient;
      activeContext.fillRect(0, 0, width, height);

      for (const particle of particlesRef.current) {
        if (!reducedMotion) {
          particle.x += particle.velocityX * profile.particleVelocity;
          particle.y += particle.velocityY * profile.particleVelocity;
        }

        if (particle.x < -12) particle.x = width + 12;
        if (particle.x > width + 12) particle.x = -12;
        if (particle.y < -12) particle.y = height + 12;
        if (particle.y > height + 12) particle.y = -12;

        activeContext.beginPath();
        activeContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        activeContext.fillStyle = `hsla(${particle.hue}, 54%, 68%, ${particle.alpha * profile.alpha})`;
        activeContext.fill();
      }

      animationFrameRef.current = window.requestAnimationFrame(render);
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      reducedMotion = motionQuery.matches;
    };

    resize();
    render();
    window.addEventListener("resize", resize);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", resize);
      motionQuery.removeEventListener("change", handleMotionChange);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cadence, language, profile]);

  return (
    <div className={`relative overflow-hidden ${className}`} dir={direction} lang={language}>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-80" aria-hidden="true" />
      <p className="relative z-10 whitespace-pre-wrap font-arsans text-lg leading-[1.95] text-[#F7F3EC]/82" dir={direction}>
        {visibleText}
        <span
          className={`ml-1 inline-block h-[1.1em] w-px translate-y-1 bg-[#C9A86A] align-baseline transition-opacity ${isComplete ? "opacity-0" : "opacity-100"}`}
          aria-hidden="true"
        />
      </p>
    </div>
  );
}

function createParticles(profile: CadenceProfile, width: number, height: number, language: TypewriterLanguage): Particle[] {
  return Array.from({ length: profile.particleCount }, (_, index) => {
    const directionMultiplier = language === "ar" ? -1 : 1;
    const phase = index / Math.max(1, profile.particleCount - 1);
    return {
      x: width * pseudoRandom(index, 11),
      y: height * pseudoRandom(index, 29),
      radius: 0.7 + pseudoRandom(index, 47) * 1.9,
      velocityX: directionMultiplier * (0.18 + pseudoRandom(index, 71) * 0.82),
      velocityY: -0.35 + pseudoRandom(index, 97) * 0.7,
      alpha: 0.42 + pseudoRandom(index, 131) * 0.58,
      hue: 34 + phase * 42,
    };
  });
}

function pseudoRandom(index: number, salt: number) {
  const value = Math.sin(index * 999 + salt * 77) * 10000;
  return value - Math.floor(value);
}

function formatTextForLanguage(text: string, language: TypewriterLanguage) {
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (language === "ar") {
    return normalized
      .replace(/\s+([،؛؟.!])/g, "$1")
      .replace(/([\u0600-\u06FF])\s+([ًٌٍَُِّْ])/g, "$1$2")
      .replace(/\.{3}/g, "…");
  }

  return normalized.replace(/\s+([,.;:?!])/g, "$1").replace(/\.{3}/g, "...");
}
