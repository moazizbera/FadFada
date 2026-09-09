export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, accessSync, constants } from "fs";
import { join } from "path";
import { getPersonaEdgeTTS } from "../../../../lib/tts";

// In-memory cache so repeated identical companion lines are not re-synthesized.
// Vercel's filesystem is read-only, so the public/tts-cache write path is skipped
// in production and this map avoids paying for the same text twice per instance.
const audioCache = new Map<string, string>();

type TTSRequestBody = {
  personaId: string;
  text: string;
  language?: "ar" | "en";
};

const GOOGLE_TTS_VOICE_MAP: Record<string, { languageCode: string; name: string; ssmlGender: "MALE" | "FEMALE" }> = {
  "ar-SA-HamedNeural": { languageCode: "ar-XA", name: "ar-XA-Wavenet-B", ssmlGender: "MALE" },
  "ar-SA-ZariyahNeural": { languageCode: "ar-XA", name: "ar-XA-Wavenet-A", ssmlGender: "FEMALE" },
  "ar-EG-SalmaNeural": { languageCode: "ar-XA", name: "ar-XA-Wavenet-D", ssmlGender: "FEMALE" },
  "ar-EG-ShakirNeural": { languageCode: "ar-XA", name: "ar-XA-Wavenet-C", ssmlGender: "MALE" },
  "ar-AE-HamdanNeural": { languageCode: "ar-XA", name: "ar-XA-Wavenet-C", ssmlGender: "MALE" },
  "ar-AE-FatimaNeural": { languageCode: "ar-XA", name: "ar-XA-Wavenet-A", ssmlGender: "FEMALE" },
  "ar-SA-ZaydNeural": { languageCode: "ar-XA", name: "ar-XA-Wavenet-B", ssmlGender: "MALE" },
  "ar-KW-FahedNeural": { languageCode: "ar-XA", name: "ar-XA-Wavenet-C", ssmlGender: "MALE" },
  "en-US-AndrewNeural": { languageCode: "en-US", name: "en-US-Wavenet-D", ssmlGender: "MALE" },
  "en-US-JennyNeural": { languageCode: "en-US", name: "en-US-Wavenet-F", ssmlGender: "FEMALE" },
  "en-US-DavisNeural": { languageCode: "en-US", name: "en-US-Wavenet-D", ssmlGender: "MALE" },
};

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequestBody = await request.json();
    const { personaId, text } = body;

    if (!personaId || !text) {
      return NextResponse.json({ error: "personaId and text are required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ audioUrl: null, personaId, error: "GOOGLE_TTS_API_KEY or GEMINI_TTS_API_KEY not set" });
    }

    const edgeTtsConfig = getPersonaEdgeTTS(personaId);
    const googleVoice = GOOGLE_TTS_VOICE_MAP[edgeTtsConfig.voice];
    if (!googleVoice) {
      return NextResponse.json({ audioUrl: null, personaId, error: `No Google TTS voice for ${edgeTtsConfig.voice}` });
    }

    const rate = parseFloat(edgeTtsConfig.rate) / 100 + 1;
    const edgeHz = parseFloat(edgeTtsConfig.pitch.replace("Hz", ""));
    const semitones = edgeHz >= 80 ? 4 : edgeHz >= 60 ? 3 : edgeHz >= 50 ? 2 : edgeHz >= 20 ? 1 : edgeHz <= -10 ? -1 : 0;
    const pitchStr = semitones >= 0 ? `+${semitones}st` : `${semitones}st`;

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { ssml: `<speak><prosody rate="${rate.toFixed(1)}" pitch="${pitchStr}">${escapeXml(text)}</prosody></speak>` },
          voice: {
            languageCode: googleVoice.languageCode,
            name: googleVoice.name,
            ssmlGender: googleVoice.ssmlGender,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: rate,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Google TTS error:", err);
      return NextResponse.json({ audioUrl: null, personaId, error: "Google TTS failed" });
    }

    const data = await response.json();
    const audioContent = data.audioContent as string;

    const hash = simpleHash(text);
    const cacheKey = `${personaId}:${hash}`;

    // Memory cache first (production path): reuse identical synth output.
    if (audioCache.has(cacheKey)) {
      return NextResponse.json({ audioContent: audioCache.get(cacheKey), personaId, _cached: true });
    }

    const publicDir = join(process.cwd(), "public");

    let canWrite = false;
    try { accessSync(publicDir, constants.W_OK); canWrite = true; } catch { canWrite = false; }

    if (canWrite) {
      const ttsDir = join(publicDir, "tts-cache", personaId);
      mkdirSync(ttsDir, { recursive: true });
      const audioPath = join(ttsDir, `${hash}.mp3`);
      if (!existsSync(audioPath)) {
        const buf = Buffer.from(audioContent, "base64");
        await import("fs/promises").then((fs) => fs.writeFile(audioPath, buf));
      }
      return NextResponse.json({ audioUrl: `/tts-cache/${personaId}/${hash}.mp3`, personaId });
    }

    audioCache.set(cacheKey, audioContent);
    return NextResponse.json({
      audioContent,
      personaId,
      _playable: true,
    });
  } catch (error) {
    console.error("Persona TTS error:", error);
    return NextResponse.json({ audioUrl: null }, { status: 200 });
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function simpleHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}
