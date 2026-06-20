import type { WorldId } from "./worlds";

export type ReflectInput = {
  messageText: string;
  currentWorld: WorldId;
  currentLanguage: "ar" | "en";
};

export type ReflectOutput = {
  replyText: string;
  world: WorldId;
  resources?: Array<{ title: string; type: "video" | "article" | "document"; url: string; summary: string }>;
};

const crisisPattern = /suicide|kill myself|end my life|self harm|hurt myself|انتحار|انتحر|اموت نفسي|أموت نفسي|أذي نفسي|اذي نفسي/i;

export function inferWorld(messageText: string, fallback: WorldId): WorldId {
  const text = messageText.toLowerCase();
  if (crisisPattern.test(text)) return "grief";
  if (/story|حكاية|قصة|قصه|حدوتة|mohamed ali|muhammad ali|محمد علي/.test(text)) return "story";
  if (/video|resource|material|study|learn|english|pdf|article|فيديو|تعلم|مصادر|شرح/.test(text)) return "learning";
  if (/plan|schedule|routine|خطة|جدول|رتب|نظم/.test(text)) return "build";
  if (/congrat|great news|نجحت|فرحان|فرحانة/.test(text)) return "celebration";
  if (/pray|faith|دعاء|صلاة|ربنا|إيمان|ايمان/.test(text)) return "faith";
  return fallback || "calm";
}

export function reflectLocally(input: ReflectInput): ReflectOutput {
  const world = inferWorld(input.messageText, input.currentWorld);
  const language = input.currentLanguage;
  const text = input.messageText;

  if (world === "grief") {
    return {
      world,
      replyText:
        language === "ar"
          ? "أنا معاك دلوقتي. لو في خطر مباشر أو ممكن تأذي نفسك، اتصل بالطوارئ أو خليك مع شخص موثوق في نفس المكان. الكويت 147، السعودية 920033360، الإمارات 800-4673، و findahelpline.com لأي بلد. فضفضة ليست بديلًا عن مختص أو طوارئ."
          : "I am with you right now. If there is immediate danger or you might hurt yourself, call local emergency services or stay with a trusted person nearby. Kuwait 147, Saudi 920033360, UAE 800-4673, and findahelpline.com can help internationally. FadFada is not a substitute for emergency care.",
    };
  }

  if (/mohamed ali|muhammad ali|mohammad ali|محمد علي|محمد على/i.test(text)) {
    const story =
      language === "ar"
        ? "في أوائل القرن التاسع عشر، ظهر محمد علي باشا في مصر وسط بلد مرهق من صراع العثمانيين والمماليك والفرنسيين. بدأ كضابط، لكنه فهم أن السلطة لا تعيش بالسيف وحده. بنى جيشًا، أرسل بعثات، فتح مدارس ومصانع، وربط الزراعة والقطن بمشروع دولة حديثة. لكن الحكاية ليست ذهبية بالكامل؛ صعوده كان قاسيًا ومركزيًا. لذلك تبقى قصته سؤالًا قديمًا: كيف نبني قوة حقيقية من غير أن تسحق الإنسان؟"
        : "In the early 1800s, Mohamed Ali Basha rose in Egypt after years of conflict between Ottoman forces, Mamluks, and the French. He began as an officer, then built a state project: an army, schools, factories, student missions abroad, and an economy pushed by cotton. Many call him the founder of modern Egypt, but the story has a hard edge. His power was forceful and centralized. His life asks an old question: how much does a nation pay when one man builds strength from the top down?";
    return { world: /video|resource|material|فيديو|مصادر/i.test(text) ? "learning" : "story", replyText: story, resources: buildResources("Mohamed Ali Basha") };
  }

  if (world === "learning") {
    const topic = extractTopic(text) || (language === "ar" ? "الموضوع" : "this topic");
    return {
      world,
      replyText:
        language === "ar"
          ? `خلينا نخلي ${topic} مادة سهلة تمسكها بإيدك: ابدأ بفيديو واحد، ثم اكتب خمس أسئلة تذكّر، وبعدها لخّص الفكرة بصوتك في دقيقة.`
          : `Let's make ${topic} something you can actually hold: start with one video, write five recall questions, then explain the idea out loud in one minute.`,
      resources: buildResources(topic),
    };
  }

  if (world === "build") {
    return {
      world,
      replyText:
        language === "ar"
          ? "نحوّلها لخطة قصيرة: 1. هدف واحد واضح. 2. خطوة مدتها 15 دقيقة. 3. شيء واحد تتجاهله الآن. 4. مراجعة صغيرة بعد التنفيذ."
          : "Let's turn it into a short plan: 1. One clear goal. 2. One 15-minute action. 3. One thing to ignore for now. 4. A small review after execution.",
    };
  }

  if (world === "story") {
    return {
      world,
      replyText:
        language === "ar"
          ? "في مدينة قديمة كانت النوافذ فيها تحفظ أسرار أصحابها، عاش شاب يخبئ تعبه في جيبه كأنه مفتاح صدئ. كل صباح يبتسم للناس، وكل مساء يعود وفي صدره سوق كامل من الأصوات. وفي ليلة مطر، جلس أمام كوب شاي بارد، وكتب على ورقة صغيرة: لا أحتاج أن أنتصر على حياتي كلها الليلة؛ يكفيني أن أفتح نافذة واحدة. فتح النافذة، فدخل هواء خفيف، ليس كافيًا ليغيّر العالم، لكنه كان كافيًا ليذكّره أن القلب لا يحتاج معجزة دائمًا؛ أحيانًا يحتاج مكانًا صغيرًا يتنفس فيه."
          : "In an old city where windows kept the secrets of their owners, a young person carried exhaustion like a rusted key in their pocket. Every morning they smiled for people, and every night they returned with a whole market of noise inside their chest. One rainy evening, beside a cold cup of tea, they wrote: I do not need to defeat my whole life tonight; I only need to open one window. They opened it. The air that entered did not change the world, but it reminded them that the heart does not always need a miracle. Sometimes it only needs one small place to breathe.",
    };
  }

  return {
    world,
    replyText:
      language === "ar"
        ? "أنا سامعك. خلينا نبطئ اللحظة ونختار خطوة صغيرة واضحة بدل ما نحاول نحل كل شيء مرة واحدة."
        : "I hear you. Let's slow the moment down and choose one clear small step instead of trying to solve everything at once.",
  };
}

function extractTopic(text: string) {
  const match = text.match(/(?:for|about|study|learn|video|material|resources|عن|لـ|ل)\s+(.{2,60})/i);
  return match?.[1]?.replace(/[?.!؟]/g, "").trim();
}

function buildResources(topic: string) {
  return [
    {
      title: `Video path for ${topic}`,
      type: "video" as const,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`,
      summary: `Search and watch one strong overview for ${topic}. If YouTube blocks embedded playback, keep the query here and open externally only for playback.`,
    },
    {
      title: `One-page notes for ${topic}`,
      type: "document" as const,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${topic} notes`)}`,
      summary: `Focus question, three anchor facts, one thing to verify, and a 60-second memory check for ${topic}.`,
    },
  ];
}
