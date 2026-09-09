"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { findBrowserVoiceForEdgeTTS, getCachedVideoPath } from "../lib/tts";

type VoiceConfig = {
  locale: string;
  rate: number;
  pitch: number;
};

type PersonaSpeakingProps = {
  personaId: string;
  avatarPath: string;
  displayName: string;
  text: string;
  language: "ar" | "en";
  voiceConfig: VoiceConfig;
  edgeTtsVoiceName: string;
  glowColorHex?: string;
  autoPlay?: boolean;
  useStaticImg?: boolean;
  onSpeakingEnd?: () => void;
};

type ManifestEntry = {
  text: string;
  hash: string;
  output: string;
};

export default function PersonaSpeaking({
  personaId,
  avatarPath,
  displayName,
  text,
  language,
  voiceConfig,
  edgeTtsVoiceName,
  glowColorHex = "#C9A86A",
  autoPlay = false,
  useStaticImg = false,
  onSpeakingEnd,
}: PersonaSpeakingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onSpeakingEndRef = useRef(onSpeakingEnd);
  const startedKeyRef = useRef<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  useEffect(() => {
    onSpeakingEndRef.current = onSpeakingEnd;
  }, [onSpeakingEnd]);

  useEffect(() => {
    if (typeof window === "undefined" || !autoPlay) return;

    const exactPath = getCachedVideoPath(personaId, text);

    Promise.all([
      fetch(exactPath, { method: "HEAD" })
        .then((res) => (res.ok ? exactPath : null))
        .catch(() => null),
      findBestMatch(personaId, text),
      fetchTTSAudio(personaId, text),
    ]).then(([exactMatch, fuzzyMatch, audioUrl]) => {
      const matchedVideo = exactMatch || fuzzyMatch;
      if (matchedVideo) setVideoSrc(matchedVideo);
      if (audioUrl) setAudioSrc(audioUrl);
    });
  }, [personaId, text, autoPlay]);

  useEffect(() => {
    if (!autoPlay) {
      startedKeyRef.current = null;
      return;
    }
    if (!audioSrc && !videoSrc) return;

    const startedKey = `${personaId}|${text}|${audioSrc}|${videoSrc}`;
    if (startedKeyRef.current === startedKey) return;
    startedKeyRef.current = startedKey;

    let cancelled = false;
    const stopAll = () => {
      if (cancelled) return;
      setSpeaking(false);
      onSpeakingEndRef.current?.();
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };

    const video = videoRef.current;
    const audio = audioSrc ? new Audio(audioSrc) : null;
    audioRef.current = audio;

    if (audio) {
      if (video && videoSrc) {
        video.muted = true;
        video.loop = true;
        video.play().catch(() => {});
      }
      audio.onplay = () => { if (!cancelled) setSpeaking(true); };
      audio.onended = stopAll;
      audio.onerror = stopAll;
      audio.play().catch(() => {
        if (video && videoSrc) {
          video.muted = false;
          video.loop = false;
          video.play().catch(() => {});
          video.onplay = () => { if (!cancelled) setSpeaking(true); };
          video.onended = stopAll;
        }
      });
    } else if (video && videoSrc) {
      video.muted = false;
      video.loop = false;
      video.play().catch(() => {});
      video.onplay = () => { if (!cancelled) setSpeaking(true); };
      video.onended = stopAll;
    }

    return () => {
      cancelled = true;
      if (audio) audio.pause();
      if (video) { video.pause(); video.currentTime = 0; }
      audioRef.current = null;
    };
  }, [personaId, text, videoSrc, audioSrc, autoPlay]);

  const wrapperClass = "relative mt-1 block h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0E0D10]";

  if (videoSrc) {
    return (
      <span className={wrapperClass}>
        <video
          ref={videoRef}
          src={videoSrc}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        {speaking && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400" />
        )}
      </span>
    );
  }

  return (
    <span
      className={`${wrapperClass} ${speaking ? "shadow-[0_0_12px]" : "shadow-[0_12px_28px_rgba(0,0,0,0.28)]"}`}
      style={speaking ? { boxShadow: `0 0 12px ${glowColorHex}` } : undefined}
    >
      {useStaticImg ? (
        <img src={avatarPath} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        <Image src={avatarPath} alt={displayName} fill sizes="80px" className="object-cover" />
      )}
      {speaking && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400" />
      )}
    </span>
  );
}

async function fetchTTSAudio(personaId: string, text: string): Promise<string | null> {
  try {
    const res = await fetch("/api/persona/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId, text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.audioUrl) return data.audioUrl;
    if (data.audioContent) return `data:audio/mp3;base64,${data.audioContent}`;
    return null;
  } catch {
    return null;
  }
}

async function findBestMatch(personaId: string, text: string): Promise<string | null> {
  try {
    const res = await fetch("/precache/manifest.json");
    if (!res.ok) return null;
    const manifest: Record<string, ManifestEntry[]> = await res.json();
    const entries = manifest[personaId];
    if (!entries || entries.length === 0) return null;

    const lowerText = text.toLowerCase().trim();

    const ranked = entries
      .map((e) => ({
        path: e.output,
        score: textSimilarity(lowerText, e.text.toLowerCase().trim()),
      }))
      .sort((a, b) => b.score - a.score);

    return ranked[0].score > 0.15 ? ranked[0].path : null;
  } catch {
    return null;
  }
}

function textSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  const aWords = normalizeWords(a);
  const bWords = normalizeWords(b);
  if (bWords.length === 0) return 0;
  const aSet = new Set(aWords);
  let present = 0;
  for (const w of bWords) {
    if (aSet.has(w)) present++;
  }
  return present / bWords.length;
}

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s\u0640]+/)
    .map((w) => w.replace(/[^\u0600-\u06FFa-z0-9]+/g, ""))
    .filter(Boolean);
}
