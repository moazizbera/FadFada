import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createGeminiClient, isGeminiConfigured } from "../../../../lib/gemini";

type StoryboardImageRequest = {
  prompt?: string;
  title?: string;
  sceneNumber?: number;
  variation?: number;
  language?: "ar" | "en";
};

export const runtime = "nodejs";
export const maxDuration = 60;

const defaultStoryboardImageModel = "gemini-2.5-flash-image-preview";
const fallbackImageModels = ["gemini-2.0-flash-preview-image-generation"];
const defaultImagenModel = "imagen-4.0-generate-001";
const fallbackImagenModels = ["imagen-3.0-generate-002"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StoryboardImageRequest;
    const prompt = cleanText(body.prompt, 1200);
    const title = cleanText(body.title, 120) || "FadFada scene";
    const sceneNumber = cleanSceneNumber(body.sceneNumber);
    const variation = cleanVariation(body.variation);
    const language = body.language === "ar" ? "ar" : "en";

    if (!prompt) {
      return NextResponse.json({ error: "MISSING_PROMPT" }, { status: 400 });
    }

    const requestedModel = process.env.STORYBOARD_IMAGE_MODEL?.trim() || process.env.NANO_BANANA_MODEL?.trim() || process.env.GEMINI_IMAGE_MODEL?.trim() || defaultStoryboardImageModel;
    const modelCandidates = Array.from(new Set([requestedModel, ...fallbackImageModels]));
    const requestedImagenModel = process.env.STORYBOARD_IMAGEN_MODEL?.trim() || process.env.IMAGEN_MODEL?.trim() || defaultImagenModel;
    const imagenModelCandidates = Array.from(new Set([requestedImagenModel, ...fallbackImagenModels]));
    const imageLocation = process.env.STORYBOARD_IMAGE_LOCATION?.trim() || process.env.NANO_BANANA_LOCATION?.trim() || process.env.GEMINI_IMAGE_LOCATION?.trim() || "global";
    const imageApiKey = process.env.STORYBOARD_IMAGE_API_KEY?.trim() || process.env.NANO_BANANA_API_KEY?.trim() || process.env.GEMINI_IMAGE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
    const fallbackReasons: string[] = [];

    if (imageApiKey) {
      const ai = new GoogleGenAI({ apiKey: imageApiKey });
      for (const model of imagenModelCandidates) {
        try {
          const imagePart = await generateImagenImage(ai, model, prompt, title, language);
          if (imagePart) {
            return storyboardImageJson({
              imageDataUrl: `data:${imagePart.mimeType};base64,${imagePart.data}`,
              model,
              source: "imagen_api_key",
            });
          }
        } catch (error) {
          console.error(`Storyboard Imagen API-key model fallback: ${model}`, error);
          fallbackReasons.push(`imagen_api_key:${model}:${getImageErrorStatus(error)}`);
        }
      }

      for (const model of modelCandidates) {
        try {
          const imagePart = await generateStoryboardImage(ai, model, prompt, title, language);
          if (imagePart) {
            return storyboardImageJson({
              imageDataUrl: `data:${imagePart.mimeType};base64,${imagePart.data}`,
              model,
              source: "storyboard_api_key",
            });
          }
        } catch (error) {
          console.error(`Storyboard image API-key model fallback: ${model}`, error);
          fallbackReasons.push(`api_key:${model}:${getImageErrorStatus(error)}`);
        }
      }
    } else {
      fallbackReasons.push("api_key:missing");
    }

    if (isGeminiConfigured()) {
      const ai = createGeminiClient(request.headers.get("x-vercel-oidc-token"), imageLocation, "v1beta");
      for (const model of imagenModelCandidates) {
        try {
          const imagePart = await generateImagenImage(ai, model, prompt, title, language);
          if (imagePart) {
            return storyboardImageJson({
              imageDataUrl: `data:${imagePart.mimeType};base64,${imagePart.data}`,
              model,
              location: imageLocation,
              source: "imagen_vertex",
            });
          }
        } catch (error) {
          console.error(`Storyboard Imagen model fallback: ${model}`, error);
          fallbackReasons.push(`imagen_vertex:${model}:${getImageErrorStatus(error)}`);
        }
      }

      for (const model of modelCandidates) {
        try {
          const imagePart = await generateStoryboardImage(ai, model, prompt, title, language);
          if (imagePart) {
            return storyboardImageJson({
              imageDataUrl: `data:${imagePart.mimeType};base64,${imagePart.data}`,
              model,
              location: imageLocation,
              source: "storyboard_vertex",
            });
          }
        } catch (error) {
          console.error(`Storyboard image model fallback: ${model}`, error);
          fallbackReasons.push(`vertex:${model}:${getImageErrorStatus(error)}`);
        }
      }
    } else {
      fallbackReasons.push("vertex:not_configured");
    }

    if (process.env.STORYBOARD_PROMPT_IMAGE_FALLBACK?.trim().toLowerCase() !== "off") {
      return storyboardImageJson({
        imageDataUrl: buildPromptImageFallbackUrl({ title, prompt, sceneNumber, variation, language }),
        model: "pollinations-flux-fallback",
        location: imageLocation,
        source: "prompt_image_fallback",
        fallbackReason: fallbackReasons.join(" | ").slice(0, 500),
      });
    }

    return storyboardImageJson({
      imageDataUrl: buildCuratedFallbackImageUrl({ title, prompt, sceneNumber }),
      model: "curated-cinematic-fallback",
      location: imageLocation,
      source: "fallback",
      fallbackReason: fallbackReasons.join(" | ").slice(0, 500),
    });
  } catch (error) {
    console.error("Storyboard image generation failed", error);
    return NextResponse.json({ error: "STORYBOARD_IMAGE_FAILED" }, { status: 500 });
  }
}

function cleanText(value: string | undefined, maxLength: number) {
  return value?.trim().slice(0, maxLength) || "";
}

function storyboardImageJson(body: Record<string, unknown>) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function cleanSceneNumber(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(1, Math.min(9, Math.round(value || 1))) : 1;
}

function cleanVariation(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.min(9999, Math.round(value || 0))) : 0;
}

function buildStoryboardPrompt({ prompt, title, language }: { prompt: string; title: string; language: "ar" | "en" }) {
  return [
    "Create one safe symbolic cinematic image for the FadFada emotional reflection storyboard, like a single frame from a quiet emotional short film.",
    "The image should feel premium, calm, culturally respectful, story-specific, and suitable for a wellbeing PWA.",
    "Use metaphor, light, space, posture, and environmental detail instead of literal private details.",
    "Keep one consistent unnamed protagonist or symbolic subject when the prompt implies a person, with continuity in silhouette, clothing tone, and emotional posture.",
    "Represent the exact scene content. Do not replace it with generic books, open pages, libraries, stars, or random atmospheric stock imagery unless those objects are explicitly central.",
    "Avoid text, logos, watermarks, medical or therapy symbols, violence, gore, nudity, and celebrity likeness.",
    "Make the composition work as a 16:9 storyboard frame with foreground, middle ground, background, and clear emotional atmosphere.",
    `Scene title: ${title}.`,
    `User language context: ${language}.`,
    `Scene prompt: ${prompt}.`,
    "Output only the image.",
  ].join("\n");
}

async function generateStoryboardImage(ai: GoogleGenAI, model: string, prompt: string, title: string, language: "ar" | "en") {
  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [{ text: buildStoryboardPrompt({ prompt, title, language }) }],
      },
    ],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  } as never);

  return extractInlineImage(result);
}

async function generateImagenImage(ai: GoogleGenAI, model: string, prompt: string, title: string, language: "ar" | "en") {
  const result = await ai.models.generateImages({
    model,
    prompt: buildStoryboardPrompt({ prompt, title, language }),
    config: {
      numberOfImages: 1,
      aspectRatio: "16:9",
      outputMimeType: "image/jpeg",
      includeRaiReason: true,
      personGeneration: "ALLOW_ADULT",
      safetyFilterLevel: "BLOCK_ONLY_HIGH",
      enhancePrompt: true,
    },
  } as never);

  return extractGeneratedImage(result);
}

function extractInlineImage(result: unknown): { data: string; mimeType: string } | null {
  const candidates = (result as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> }).candidates || [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      const data = part.inlineData?.data;
      const mimeType = part.inlineData?.mimeType || "image/png";
      if (data && mimeType.startsWith("image/")) {
        return { data, mimeType };
      }
    }
  }

  return null;
}

function extractGeneratedImage(result: unknown): { data: string; mimeType: string } | null {
  const generatedImages = (result as { generatedImages?: Array<{ image?: { imageBytes?: string; mimeType?: string } }> }).generatedImages || [];
  for (const generatedImage of generatedImages) {
    const data = generatedImage.image?.imageBytes;
    const mimeType = generatedImage.image?.mimeType || "image/jpeg";
    if (data) return { data, mimeType };
  }

  return null;
}

function buildPromptImageFallbackUrl({ title, prompt, sceneNumber, variation, language }: { title: string; prompt: string; sceneNumber: number; variation: number; language: "ar" | "en" }) {
  const seed = hashText(`${title}:${prompt}:${sceneNumber}:${variation}`) % 1_000_000;
  const cinematicDirection = getPromptFallbackCinematicDirection(sceneNumber, variation);
  const visualPrompt = [
    "Cinematic symbolic storyboard frame from a quiet emotional short film, emotionally faithful to the exact scene, not generic stock photography and not a random mood image.",
    "Create the exact visual moment described in the scene prompt, with distinct setting, protagonist posture, light, atmosphere, and story-specific objects.",
    "If a person or symbolic figure is implied, keep a single consistent unnamed protagonist with the same silhouette, clothing tone, and emotional posture across storyboard variations.",
    cinematicDirection,
    "Premium film still, expressive composition, rich environmental detail, foreground middle ground background, depth of field, dramatic but calm lighting, 16:9 widescreen, story concept art quality.",
    "Avoid default open books, blank pages, generic libraries, generic star wallpapers, and decorative filler unless those objects are explicitly central to the prompt.",
    "No written text, no captions, no logos, no watermarks, no book unless the prompt explicitly asks for a book or manuscript.",
    language === "ar" ? "The scene prompt may be Arabic; interpret its meaning visually and do not draw Arabic text." : "Interpret the scene visually without adding text.",
    `Scene title: ${title}.`,
    `Scene prompt: ${prompt}.`,
  ].join(" ");

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt.slice(0, 1800))}?width=1280&height=720&seed=${seed}&model=flux&nologo=true&private=true&enhance=true&safe=true`;
}

function getPromptFallbackCinematicDirection(sceneNumber: number, variation: number) {
  const directions = [
    "Wide establishing shot with a clear foreground figure, meaningful background, and one strong motivated light source.",
    "Over-the-shoulder medium shot that shows what the character is looking at, with cinematic framing and emotional body language.",
    "Close symbolic detail shot with hands, light, texture, or object-as-metaphor, while keeping the full scene context readable.",
    "Low-angle dramatic frame with layered silhouettes, environmental depth, and a visible path from darkness toward light.",
    "Quiet film still with negative space, warm practical light, cool shadows, and a composition that feels like a real story moment.",
  ];

  return directions[(sceneNumber + variation) % directions.length];
}

function buildCuratedFallbackImageUrl({ title, prompt, sceneNumber }: { title: string; prompt: string; sceneNumber: number }) {
  const seed = hashText(`${title}:${prompt}:${sceneNumber}`);
  const visual = buildFallbackVisualTheme(prompt, seed);
  const photoIds = selectCuratedPhotoIds(visual);
  const photoId = photoIds[seed % photoIds.length];

  return `https://images.unsplash.com/photo-${photoId}?w=1280&h=720&fit=crop&crop=entropy&auto=format&q=88&ixlib=rb-4.0.3`;
}

function selectCuratedPhotoIds(visual: FallbackVisualTheme) {
  if (visual.hasStars || visual.hasWindow) {
    return [
      "1519681393784-d120267933ba", // star field, cinematic night
      "1500530855697-b586d89ba3ee", // warm interior looking outward
      "1493246507139-91e8fad9978e", // night landscape, reflective light
      "1419242902214-272b3f66ee7a", // dark cinematic horizon
    ];
  }

  if (visual.hasDoor) {
    return [
      "1497366754035-f200968a6e72", // doorway / architecture light
      "1500530855697-b586d89ba3ee", // warm room and light
      "1506905925346-21bda4d32df4", // abstract light path
      "1518837695005-2083093ee35b", // beacon / hope
    ];
  }

  if (visual.hasMirror) {
    return [
      "1500530855697-b586d89ba3ee", // quiet interior
      "1497366811353-6870744d04b2", // reflective architecture
      "1579546929518-9e396f3cc809", // abstract reflection color
      "1506905925346-21bda4d32df4", // luminous abstraction
    ];
  }

  if (visual.hasManuscript) {
    return [
      "1457369804613-52c61a468e7d", // books/library, only explicit book prompts
      "1516979187457-637abb4f9353", // reading/paper atmosphere
      "1495446815901-a7297e633e8d", // books close-up
      "1512820790803-83ca734da794", // pages/books
    ];
  }

  if (visual.hasBaghdad || visual.hasRoom) {
    return [
      "1500530855697-b586d89ba3ee", // warm emotional interior
      "1497366754035-f200968a6e72", // architecture, cinematic depth
      "1518837695005-2083093ee35b", // distant light / horizon
      "1451187580459-43490c3f84b88", // dramatic landscape
    ];
  }

  return [
    "1500530855697-b586d89ba3ee",
    "1518837695005-2083093ee35b",
    "1451187580459-43490c3f84b88",
    "1506905925346-21bda4d32df4",
  ];
}

function getImageErrorStatus(error: unknown) {
  const status = (error as { status?: number; code?: number }).status || (error as { status?: number; code?: number }).code;
  if (status) return `status_${status}`;
  if (error instanceof Error) return error.message.slice(0, 120).replace(/[^a-z0-9_ .:-]/gi, "");
  return "unknown_error";
}

function buildFallbackSceneDataUrl({ title, prompt, sceneNumber, language }: { title: string; prompt: string; sceneNumber: number; language: "ar" | "en" }) {
  const seed = hashText(`${title}:${prompt}:${sceneNumber}`);
  const visual = buildFallbackVisualTheme(prompt, seed);
  const direction = language === "ar" ? "rtl" : "ltr";
  const commonDefs = `<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="hsl(${visual.hue},44%,11%)"/><stop offset="0.46" stop-color="hsl(${visual.accentHue},42%,21%)"/><stop offset="1" stop-color="#0E0D10"/></linearGradient><radialGradient id="keyLight" cx="${visual.keyLightX}%" cy="${visual.keyLightY}%" r="58%"><stop offset="0" stop-color="hsl(${visual.warmHue},84%,76%)" stop-opacity="0.76"/><stop offset="0.33" stop-color="hsl(${visual.warmHue},78%,58%)" stop-opacity="0.29"/><stop offset="1" stop-color="transparent"/></radialGradient><radialGradient id="coolShadow" cx="18%" cy="78%" r="72%"><stop offset="0" stop-color="hsl(${visual.coolHue},70%,45%)" stop-opacity="0.28"/><stop offset="1" stop-color="transparent"/></radialGradient><filter id="soft"><feGaussianBlur stdDeviation="18"/></filter><filter id="deepShadow"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#050407" flood-opacity="0.58"/></filter><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.84" numOctaves="2" seed="${seed % 97}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.08"/></feComponentTransfer></filter><linearGradient id="floorGlow" x1="0" x2="1"><stop offset="0" stop-color="hsl(${visual.coolHue},62%,33%)" stop-opacity="0.12"/><stop offset="0.62" stop-color="hsl(${visual.warmHue},84%,72%)" stop-opacity="0.35"/><stop offset="1" stop-color="transparent"/></linearGradient></defs>`;
  const frame = `<rect width="1280" height="720" fill="url(#bg)"/><rect width="1280" height="720" fill="url(#coolShadow)"/><rect width="1280" height="720" fill="url(#keyLight)"/><rect width="1280" height="720" filter="url(#grain)" opacity="0.55"/><path d="M0 585 C174 535 309 583 478 520 C674 446 828 456 1008 520 C1125 562 1210 542 1280 500 L1280 720 L0 720 Z" fill="url(#floorGlow)"/>${buildFallbackSceneComposition(sceneNumber, visual)}<circle cx="76" cy="76" r="14" fill="rgba(247,243,236,0.42)"/><circle cx="108" cy="76" r="6" fill="rgba(201,168,106,0.46)"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="${escapeXml(title)}" direction="${direction}">${commonDefs}${frame}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

type FallbackVisualTheme = {
  hue: number;
  accentHue: number;
  warmHue: number;
  coolHue: number;
  keyLightX: number;
  keyLightY: number;
  hasStars: boolean;
  hasWindow: boolean;
  hasManuscript: boolean;
  hasRoom: boolean;
  hasMirror: boolean;
  hasDoor: boolean;
  hasBaghdad: boolean;
};

function buildFallbackVisualTheme(prompt: string, seed: number): FallbackVisualTheme {
  const normalized = prompt.toLowerCase();
  const hasStars = /star|night|sky|cosmic|نجوم|نجم|سماء|ليل|كون/.test(normalized);
  const hasWindow = /window|نافذة|شباك/.test(normalized);
  const hasManuscript = /manuscript|parchment|paper|book|مخطوط|مخطوطة|رق|ورق|كتاب/.test(normalized);
  const hasRoom = /room|desk|lamp|غرفة|مكتب|مصباح/.test(normalized);
  const hasMirror = /mirror|reflection|مرآة|انعكاس/.test(normalized);
  const hasDoor = /door|path|step|light|باب|طريق|خطوة|ضوء/.test(normalized);
  const hasBaghdad = /baghdad|بغداد|دجلة|tigris|abbasid|عباسي/.test(normalized);
  const baseHue = hasStars ? 222 : hasBaghdad ? 198 : hasManuscript ? 34 : hasMirror ? 178 : seed % 360;

  return {
    hue: baseHue,
    accentHue: (baseHue + (hasBaghdad ? 42 : 28)) % 360,
    warmHue: hasManuscript || hasRoom || hasBaghdad ? 42 : (baseHue + 84) % 360,
    coolHue: hasStars ? 220 : (baseHue + 178) % 360,
    keyLightX: hasWindow || hasDoor ? 75 : 62,
    keyLightY: hasStars || hasWindow ? 25 : 18,
    hasStars,
    hasWindow,
    hasManuscript,
    hasRoom,
    hasMirror,
    hasDoor,
    hasBaghdad,
  };
}

function buildFallbackSceneComposition(sceneNumber: number, visual: FallbackVisualTheme) {
  if (visual.hasWindow || visual.hasStars) return buildWindowScene(visual);
  if (visual.hasManuscript) return buildManuscriptScene(visual);
  if (visual.hasMirror) return buildMirrorScene(visual);
  if (visual.hasDoor) return buildDoorScene(visual);

  const variant = ((sceneNumber - 1) % 3) + 1;

  if (variant === 1) {
    return buildRoomScene(visual);
  }

  if (variant === 2) {
    return buildMirrorScene(visual);
  }

  return buildWindowScene(visual);
}

function buildRoomScene({ warmHue, coolHue, hasBaghdad }: FallbackVisualTheme) {
  const skyline = hasBaghdad ? `<path d="M650 260 h58 v-42 h48 v42 h34 v-70 h54 v70 h68 v-48 h42 v48 h90" fill="none" stroke="rgba(247,243,236,0.19)" stroke-width="9" stroke-linejoin="round"/>` : "";
  return `${skyline}<ellipse cx="490" cy="592" rx="340" ry="54" fill="rgba(0,0,0,0.28)"/><rect x="188" y="384" width="656" height="118" rx="18" fill="rgba(14,13,16,0.56)" filter="url(#deepShadow)"/><rect x="226" y="352" width="360" height="26" rx="13" fill="hsl(${warmHue},64%,66%)" opacity="0.30"/><circle cx="486" cy="308" r="96" fill="rgba(247,243,236,0.16)" filter="url(#soft)"/><circle cx="486" cy="294" r="42" fill="rgba(247,243,236,0.40)"/><path d="M422 538 C430 424 540 424 552 538" fill="none" stroke="rgba(247,243,236,0.70)" stroke-width="36" stroke-linecap="round"/><path d="M302 432 C376 408 462 422 534 394" fill="none" stroke="hsl(${coolHue},62%,72%)" stroke-width="8" stroke-linecap="round" opacity="0.30"/><path d="M720 382 H1000" stroke="hsl(${warmHue},84%,75%)" stroke-width="13" stroke-linecap="round" opacity="0.58"/><path d="M748 427 H948" stroke="hsl(${warmHue},84%,75%)" stroke-width="8" stroke-linecap="round" opacity="0.33"/><circle cx="958" cy="292" r="54" fill="hsl(${warmHue},84%,72%)" opacity="0.14" filter="url(#soft)"/>`;
}

function buildManuscriptScene({ warmHue, coolHue }: FallbackVisualTheme) {
  return `<ellipse cx="636" cy="590" rx="500" ry="66" fill="rgba(0,0,0,0.32)"/><g filter="url(#deepShadow)"><path d="M232 186 C420 146 586 180 640 232 C710 166 892 142 1046 190 L1002 542 C850 500 724 514 640 590 C548 516 402 502 282 544 Z" fill="rgba(247,243,236,0.16)"/><path d="M318 230 C440 204 564 222 610 268 L592 492 C500 456 398 462 318 500 Z" fill="rgba(247,243,236,0.20)"/><path d="M678 268 C770 214 892 208 970 236 L930 500 C842 466 752 460 690 494 Z" fill="rgba(247,243,236,0.18)"/></g><path d="M360 304 C434 276 514 314 578 288 M350 364 C456 338 506 386 590 350 M700 306 C778 272 852 310 932 286 M704 366 C808 340 848 382 920 354" fill="none" stroke="hsl(${warmHue},84%,75%)" stroke-width="10" stroke-linecap="round" opacity="0.56"/><path d="M402 438 C500 398 596 468 684 424 C776 378 842 410 920 454" fill="none" stroke="hsl(${coolHue},62%,76%)" stroke-width="9" stroke-linecap="round" opacity="0.34"/><circle cx="914" cy="206" r="80" fill="hsl(${warmHue},84%,72%)" opacity="0.16" filter="url(#soft)"/><path d="M222 558 L1034 558" stroke="rgba(247,243,236,0.18)" stroke-width="18" stroke-linecap="round"/>`;
}

function buildWindowScene({ warmHue, coolHue, hasBaghdad }: FallbackVisualTheme) {
  const stars = Array.from({ length: 26 }, (_, index) => {
    const x = 872 + ((index * 53) % 188);
    const y = 160 + ((index * 37) % 226);
    const r = 2 + (index % 4);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${warmHue},88%,78%)" opacity="${0.42 + (index % 5) * 0.09}"/>`;
  }).join("");
  const skyline = hasBaghdad ? `<path d="M875 382 C910 350 938 350 970 382 M998 382 h58 v-56 h44 v56" fill="none" stroke="rgba(247,243,236,0.20)" stroke-width="7" stroke-linecap="round"/>` : "";
  return `<path d="M0 602 C220 500 390 546 550 492 C758 420 892 310 1280 382 L1280 720 L0 720 Z" fill="rgba(4,4,8,0.48)"/><g filter="url(#deepShadow)"><rect x="800" y="106" width="314" height="382" rx="26" fill="rgba(247,243,236,0.14)"/><rect x="838" y="144" width="238" height="302" rx="16" fill="rgba(6,8,18,0.66)"/><path d="M957 144 V446 M838 295 H1076" stroke="rgba(247,243,236,0.16)" stroke-width="10"/></g>${stars}${skyline}<circle cx="552" cy="402" r="76" fill="rgba(247,243,236,0.15)" filter="url(#soft)"/><circle cx="552" cy="380" r="42" fill="rgba(247,243,236,0.34)"/><path d="M510 548 C516 456 588 456 598 548" fill="none" stroke="rgba(247,243,236,0.62)" stroke-width="30" stroke-linecap="round"/><path d="M650 526 C760 502 820 462 884 400" fill="none" stroke="hsl(${warmHue},86%,74%)" stroke-width="13" stroke-linecap="round" opacity="0.62"/><path d="M182 604 C344 558 455 608 608 562" fill="none" stroke="hsl(${coolHue},70%,70%)" stroke-width="9" stroke-linecap="round" opacity="0.24"/>`;
}

function buildMirrorScene({ warmHue, coolHue }: FallbackVisualTheme) {
  return `<ellipse cx="640" cy="590" rx="430" ry="58" fill="rgba(0,0,0,0.30)"/><g filter="url(#deepShadow)"><rect x="404" y="112" width="472" height="464" rx="236" fill="rgba(247,243,236,0.13)"/><rect x="454" y="162" width="372" height="364" rx="186" fill="rgba(14,13,16,0.46)"/></g><path d="M518 260 C592 202 690 208 756 268" fill="none" stroke="hsl(${warmHue},82%,76%)" stroke-width="12" stroke-linecap="round" opacity="0.42"/><circle cx="592" cy="344" r="46" fill="rgba(247,243,236,0.30)"/><path d="M548 486 C558 400 630 400 640 486" fill="none" stroke="rgba(247,243,236,0.56)" stroke-width="25" stroke-linecap="round"/><circle cx="710" cy="340" r="42" fill="hsl(${coolHue},64%,70%)" opacity="0.23"/><path d="M672 484 C682 408 748 408 758 484" fill="none" stroke="hsl(${coolHue},64%,76%)" stroke-width="22" stroke-linecap="round" opacity="0.40"/><path d="M306 524 C432 478 530 540 642 504 C760 466 846 490 984 526" fill="none" stroke="hsl(${warmHue},82%,74%)" stroke-width="9" stroke-linecap="round" opacity="0.38"/>`;
}

function buildDoorScene({ warmHue, coolHue }: FallbackVisualTheme) {
  return `<path d="M0 614 C260 548 478 596 642 538 C850 465 1010 448 1280 502 L1280 720 L0 720 Z" fill="rgba(0,0,0,0.32)"/><g filter="url(#deepShadow)"><path d="M760 126 H1054 V590 H760 Z" fill="rgba(247,243,236,0.11)"/><path d="M818 178 H998 V590 H818 Z" fill="hsl(${warmHue},78%,64%)" opacity="0.30"/></g><path d="M820 590 C700 606 600 624 480 662" stroke="hsl(${warmHue},86%,76%)" stroke-width="30" stroke-linecap="round" opacity="0.24"/><circle cx="486" cy="396" r="64" fill="rgba(247,243,236,0.15)" filter="url(#soft)"/><circle cx="486" cy="376" r="38" fill="rgba(247,243,236,0.32)"/><path d="M448 536 C456 448 520 448 530 536" fill="none" stroke="rgba(247,243,236,0.60)" stroke-width="27" stroke-linecap="round"/><path d="M565 520 C654 496 718 460 800 390" fill="none" stroke="hsl(${warmHue},86%,76%)" stroke-width="13" stroke-linecap="round" opacity="0.62"/><path d="M180 570 C324 522 438 574 572 532" fill="none" stroke="hsl(${coolHue},64%,72%)" stroke-width="9" stroke-linecap="round" opacity="0.24"/>`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}