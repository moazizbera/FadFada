export type EdgeTTSConfig = {
  voice: string;
  rate: string;
  pitch: string;
};

const EDGE_TTS_VOICES: Record<string, EdgeTTSConfig> = {
  // Child personas — every one gets a unique (voice, rate, pitch) so no two sound alike.
  zain_kg_explorer: { voice: "ar-SA-HamedNeural", rate: "+22%", pitch: "+80Hz" },
  rami_riddles: { voice: "ar-SA-HamedNeural", rate: "+26%", pitch: "+70Hz" },
  faris_focus: { voice: "ar-SA-HamedNeural", rate: "+16%", pitch: "+65Hz" },
  tariq_tales: { voice: "ar-SA-HamedNeural", rate: "+13%", pitch: "+55Hz" },
  sami_space: { voice: "ar-SA-HamedNeural", rate: "+17%", pitch: "+45Hz" },
  bassel_builder: { voice: "ar-SA-HamedNeural", rate: "+20%", pitch: "+50Hz" },
  yousef_why: { voice: "ar-EG-ShakirNeural", rate: "+22%", pitch: "+60Hz" },
  kareem_kick: { voice: "ar-EG-ShakirNeural", rate: "+25%", pitch: "+70Hz" },
  zack_zoo: { voice: "ar-AE-HamdanNeural", rate: "+19%", pitch: "+55Hz" },
  deema_drama: { voice: "ar-SA-ZariyahNeural", rate: "+21%", pitch: "+75Hz" },
  nour_nature: { voice: "ar-SA-ZariyahNeural", rate: "+24%", pitch: "+80Hz" },
  amina_manners: { voice: "ar-SA-ZariyahNeural", rate: "+18%", pitch: "+60Hz" },
  hana_harmony: { voice: "ar-SA-ZariyahNeural", rate: "+14%", pitch: "+50Hz" },
  mona_museum: { voice: "ar-SA-ZariyahNeural", rate: "+16%", pitch: "+55Hz" },
  amal_empathy: { voice: "ar-SA-ZariyahNeural", rate: "+17%", pitch: "+65Hz" },
  leila_logic: { voice: "ar-EG-SalmaNeural", rate: "+21%", pitch: "+65Hz" },
  salma_sound: { voice: "ar-EG-SalmaNeural", rate: "+14%", pitch: "+60Hz" },
  // Parent/expert personas — gender-correct Arabic voices so no persona falls back to the male default.
  omar: { voice: "ar-SA-HamedNeural", rate: "+4%", pitch: "+15Hz" },
  sami: { voice: "ar-SA-HamedNeural", rate: "+2%", pitch: "+10Hz" },
  maryam: { voice: "ar-EG-SalmaNeural", rate: "+5%", pitch: "+20Hz" },
  nema: { voice: "ar-SA-ZariyahNeural", rate: "+4%", pitch: "+18Hz" },
  sanad: { voice: "ar-KW-FahedNeural", rate: "+2%", pitch: "+12Hz" },
  rawi: { voice: "ar-EG-SalmaNeural", rate: "+6%", pitch: "+25Hz" },
  nora: { voice: "ar-SA-ZariyahNeural", rate: "+10%", pitch: "+30Hz" },
  kareem: { voice: "ar-EG-ShakirNeural", rate: "+12%", pitch: "+25Hz" },
  malik: { voice: "ar-AE-HamdanNeural", rate: "+7%", pitch: "+22Hz" },
  malik_alt: { voice: "ar-SA-HamedNeural", rate: "+4%", pitch: "+18Hz" },
  sheikh: { voice: "ar-SA-HamedNeural", rate: "+3%", pitch: "+12Hz" },
  grandmaster: { voice: "ar-SA-HamedNeural", rate: "+3%", pitch: "+15Hz" },
  zein: { voice: "ar-SA-ZaydNeural", rate: "+4%", pitch: "+16Hz" },
  logoz: { voice: "ar-EG-ShakirNeural", rate: "+7%", pitch: "+20Hz" },
  poetry_bot: { voice: "ar-SA-HamedNeural", rate: "+2%", pitch: "+8Hz" },
  screenwriter: { voice: "ar-AE-HamdanNeural", rate: "+5%", pitch: "+20Hz" },
  dania: { voice: "ar-SA-ZariyahNeural", rate: "+6%", pitch: "+21Hz" },
  adam: { voice: "ar-SA-HamedNeural", rate: "+6%", pitch: "+22Hz" },
  ryan: { voice: "ar-SA-HamedNeural", rate: "+4%", pitch: "+16Hz" },
  layan: { voice: "ar-SA-ZariyahNeural", rate: "+5%", pitch: "+22Hz" },
  wamda: { voice: "ar-AE-FatimaNeural", rate: "+10%", pitch: "+32Hz" },
  radar: { voice: "ar-SA-ZaydNeural", rate: "+5%", pitch: "+20Hz" },
  layl: { voice: "ar-EG-ShakirNeural", rate: "+7%", pitch: "+24Hz" },
  sarah: { voice: "ar-SA-ZariyahNeural", rate: "+7%", pitch: "+24Hz" },
  sarah_alt: { voice: "ar-SA-ZariyahNeural", rate: "+6%", pitch: "+24Hz" },
  tareq: { voice: "ar-AE-HamdanNeural", rate: "+5%", pitch: "+16Hz" },
  dr_fahad: { voice: "ar-SA-HamedNeural", rate: "+6%", pitch: "+20Hz" },
  lulu_letters: { voice: "ar-EG-SalmaNeural", rate: "+8%", pitch: "+25Hz" },
  zizo_numbers: { voice: "ar-EG-ShakirNeural", rate: "+12%", pitch: "+30Hz" },
  tala_explorer: { voice: "ar-SA-ZariyahNeural", rate: "+10%", pitch: "+28Hz" },
  biso_kindness: { voice: "ar-SA-ZariyahNeural", rate: "+6%", pitch: "+20Hz" },
  khalid_investor: { voice: "ar-SA-HamedNeural", rate: "+5%", pitch: "+15Hz" },
  lina_consultant: { voice: "ar-SA-ZariyahNeural", rate: "+7%", pitch: "+22Hz" },
  rami_operator: { voice: "ar-AE-HamdanNeural", rate: "+6%", pitch: "+20Hz" },
  salma_planner: { voice: "ar-EG-SalmaNeural", rate: "+6%", pitch: "+22Hz" },
  youssef_builder: { voice: "ar-SA-HamedNeural", rate: "+8%", pitch: "+25Hz" },
  layla_eq: { voice: "ar-SA-ZariyahNeural", rate: "+8%", pitch: "+26Hz" },
  hana_therapist: { voice: "ar-SA-ZariyahNeural", rate: "+5%", pitch: "+20Hz" },
  noor_companion: { voice: "ar-KW-FahedNeural", rate: "+2%", pitch: "+10Hz" },
  maya_creator: { voice: "ar-AE-FatimaNeural", rate: "+10%", pitch: "+30Hz" },
  ziad_copywriter: { voice: "ar-SA-ZaydNeural", rate: "+6%", pitch: "+20Hz" },
  dana_designer: { voice: "ar-AE-FatimaNeural", rate: "+8%", pitch: "+25Hz" },
  professor_zain: { voice: "ar-SA-ZaydNeural", rate: "+5%", pitch: "+18Hz" },
  adel_debater: { voice: "ar-EG-ShakirNeural", rate: "+8%", pitch: "+22Hz" },
  hadi_researcher: { voice: "ar-SA-HamedNeural", rate: "+5%", pitch: "+18Hz" },
  faisal_njm: { voice: "ar-EG-ShakirNeural", rate: "+10%", pitch: "+28Hz" },
  coach_ibrahim: { voice: "ar-AE-HamdanNeural", rate: "+5%", pitch: "+18Hz" },
  tarek_challenger: { voice: "ar-AE-HamdanNeural", rate: "+8%", pitch: "+25Hz" },
  bilal_focus: { voice: "ar-SA-ZaydNeural", rate: "+4%", pitch: "+15Hz" },
  reem_ideator: { voice: "ar-AE-FatimaNeural", rate: "+9%", pitch: "+28Hz" },
  sami_explorer: { voice: "ar-AE-HamdanNeural", rate: "+6%", pitch: "+22Hz" },
  farah_visionary: { voice: "ar-SA-ZariyahNeural", rate: "+9%", pitch: "+28Hz" },
  amal_guide: { voice: "ar-SA-ZariyahNeural", rate: "+6%", pitch: "+22Hz" },
  yara_minimal: { voice: "ar-SA-ZariyahNeural", rate: "+5%", pitch: "+18Hz" },
  default: { voice: "en-US-AndrewNeural", rate: "+0%", pitch: "+0Hz" },
};

export function getPersonaEdgeTTS(personaId: string): EdgeTTSConfig {
  return EDGE_TTS_VOICES[personaId] || EDGE_TTS_VOICES.default;
}

export function getCachedVideoPath(personaId: string, text: string): string {
  const hash = simpleHash(text);
  return `/precache/${personaId}/${hash}.mp4`;
}

export function getCachedAudioPath(personaId: string, text: string): string {
  const hash = simpleHash(text);
  return `/tts-cache/${personaId}/${hash}.mp3`;
}

export function findBrowserVoiceForEdgeTTS(edgeTtsVoiceName: string): string | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const shortName = edgeTtsVoiceName.replace(/^[a-z]{2}-[A-Z]{2}-/, "").replace(/Neural$/, "");
  const voices = window.speechSynthesis.getVoices();

  const match = voices.find((v) => {
    const name = v.name.toLowerCase();
    return (
      name.includes(shortName.toLowerCase()) &&
      (name.includes("microsoft") || name.includes("natural") || name.includes("online"))
    );
  });

  return match?.name ?? null;
}

function simpleHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}
