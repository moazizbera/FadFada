import type { WorldId } from "./worlds";

export type ReflectInput = {
  messageText: string;
  currentWorld: WorldId;
  currentLanguage: "ar" | "en";
  behaviorStyle?: "signature" | "deep" | "coach" | "quick";
  softerMode?: boolean;
  recentMessages?: Array<{
    role: "user" | "assistant";
    text: string;
    world: WorldId;
    language: "ar" | "en";
  }>;
};

export type ReflectOutput = {
  replyText: string;
  world: WorldId;
  resources?: Array<{ title: string; type: "video" | "article" | "document"; url: string; summary: string }>;
};

const crisisPattern = /suicide|kill myself|end my life|self harm|hurt myself|انتحار|انتحر|اموت نفسي|أموت نفسي|أذي نفسي|اذي نفسي/i;
const anxietyPattern = /anxiety|anxious|panic|afraid|scared|fear|worried|nervous|قلق|قلقان|خايف|خايفة|خوف|توتر|متوتر|رعب|هلع/i;
const overwhelmPattern = /overwhelmed|stressed|pressure|too much|burnout|exhausted|مضغوط|ضغط|مرهق|تعبان|كتير|مش قادر|مش قادرة/i;
const sadnessPattern = /sad|lonely|empty|hurt|cry|broken|زعلان|زعلانة|حزين|حزينة|وحيد|وحدة|مكسور/i;
const decisionPattern = /should i|what should|choose|decide|confused|اعمل ايه|ماذا أفعل|اختار|قرار|محتار|محتارة/i;
const currentNewsPattern = /latest|last|recent|current|today|now|news|updates|score|match|fixture|world cup|fifa|كأس العالم|كاس العالم|فيفا|أخبار|اخبار|آخر|اخر|نتيجة|مباراة/i;

export function inferWorld(messageText: string, fallback: WorldId): WorldId {
  const text = messageText.toLowerCase();
  if (crisisPattern.test(text)) return "grief";
  if (currentNewsPattern.test(text)) return "learning";
  if (anxietyPattern.test(text) || overwhelmPattern.test(text) || sadnessPattern.test(text)) return "calm";
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
  const behaviorStyle = input.behaviorStyle || "signature";
  const userIntent = inferIntent(text);

  if (isArabicFollowUp(text)) {
    const previousTopic = inferPreviousTopic(input.recentMessages);

    if (previousTopic === "mohamed-ali") {
      return {
        world: "story",
        replyText: mohamedAliStory("ar"),
        resources: buildResources("Mohamed Ali Basha"),
      };
    }

    const previousAssistant = findPreviousAssistantText(input.recentMessages);
    if (previousAssistant) {
      return {
        world,
        replyText: `أكيد. خليني أعيدها لك بالعربي بشكل واضح ودافئ: ${previousAssistant}`,
      };
    }
  }

  if (isGreeting(text)) {
    return {
      world: "calm",
      replyText:
        language === "ar"
          ? "أهلًا بيك. أنا هنا معاك بهدوء. احكيلي بجملة واحدة: اللي جواك دلوقتي أقرب لإرهاق، قلق، زعل، ولا مجرد رغبة إنك تفضفض؟"
          : "Hey, I am here with you. Tell me in one sentence: is what you are carrying closer to stress, anxiety, sadness, or just a need to let something out?",
    };
  }

  if (isPersonaQuestion(text)) {
    return {
      world: "story",
      replyText: applyBehaviorStyle(buildPersonaQuestionReply(text, language), behaviorStyle, language, input.softerMode),
    };
  }

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
    const story = mohamedAliStory(language);
    return { world: /video|resource|material|فيديو|مصادر/i.test(text) ? "learning" : "story", replyText: story, resources: buildResources("Mohamed Ali Basha") };
  }

  if (isCurrentNewsRequest(text)) {
    const topic = extractNewsTopic(text, language);
    return {
      world: "learning",
      replyText: buildCurrentNewsReply(topic, language),
      resources: buildNewsResources(topic),
    };
  }

  if (isFlightAnxiety(text)) {
    return {
      world: "calm",
      replyText: applyBehaviorStyle(
        language === "ar"
          ? "خوف الطيران مفهوم، خصوصاً لأن جسمك يتعامل مع الطائرة كأنك فقدت السيطرة. جرّب هذه الخطة الصغيرة: قبل الصعود اكتب جملة واحدة: أنا لا أحتاج أن أحب الطيران، أحتاج فقط أن أعبر الرحلة. أثناء الإقلاع ركّز على قدميك على الأرض، خذ شهيقاً لأربع عدّات وزفيراً لست عدّات، وسمِّ خمسة أشياء تراها حولك. اختر مقعداً قريباً من الجناح إن استطعت، وقل للمضيف بهدوء إنك متوتر. هدفك ليس إزالة الخوف بالكامل، بل تخفيضه درجة واحدة حتى تمر الرحلة."
          : "Fear of flying makes sense, especially because your body reads the airplane as a loss of control. Try this small plan: before boarding, write one sentence: I do not need to love flying; I only need to get through this flight. During takeoff, press your feet into the floor, inhale for four counts, exhale for six, and name five things you can see around you. If you can, choose a seat near the wing and calmly tell a flight attendant you feel anxious. The goal is not to erase fear; it is to lower it one level so the flight can pass.",
        behaviorStyle,
        language,
        input.softerMode
      ),
    };
  }

  if (userIntent === "anxiety" || userIntent === "overwhelm" || userIntent === "sadness" || userIntent === "decision") {
    return {
      world: userIntent === "decision" ? "build" : "calm",
      replyText: applyBehaviorStyle(buildControlledReply(text, userIntent, language), behaviorStyle, language, input.softerMode),
    };
  }

  if (world === "learning") {
    const topic = extractTopic(text) || inferPreviousLearningTopic(input.recentMessages) || (language === "ar" ? "الموضوع" : "this topic");
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
      replyText: applyBehaviorStyle(
        language === "ar"
          ? "نحوّلها لخطة قصيرة: 1. هدف واحد واضح. 2. خطوة مدتها 15 دقيقة. 3. شيء واحد تتجاهله الآن. 4. مراجعة صغيرة بعد التنفيذ."
          : "Let's turn it into a short plan: 1. One clear goal. 2. One 15-minute action. 3. One thing to ignore for now. 4. A small review after execution.",
        behaviorStyle,
        language,
        input.softerMode
      ),
    };
  }

  if (world === "story") {
    return {
      world,
      replyText: applyBehaviorStyle(buildStoryReply(text, language, input.recentMessages), behaviorStyle, language, input.softerMode),
    };
  }

  return {
    world,
    replyText: applyBehaviorStyle(
      language === "ar"
        ? buildGeneralReply(text, "ar")
        : buildGeneralReply(text, "en"),
      behaviorStyle,
      language,
      input.softerMode
    ),
  };
}

type LocalIntent = "anxiety" | "overwhelm" | "sadness" | "decision" | "general";

function inferIntent(text: string): LocalIntent {
  if (anxietyPattern.test(text)) return "anxiety";
  if (overwhelmPattern.test(text)) return "overwhelm";
  if (sadnessPattern.test(text)) return "sadness";
  if (decisionPattern.test(text)) return "decision";
  return "general";
}

function buildControlledReply(text: string, intent: LocalIntent, language: "ar" | "en") {
  const concern = extractConcern(text, language);

  if (language === "ar") {
    if (intent === "anxiety") {
      return `اللي تصفه يبدو كقلق حول ${concern}. خلينا نعامله كإشارة من الجسم وليس كحكم على قدرتك. الآن جرّب ثلاث خطوات: سمِّ الخوف بجملة واحدة، خذ زفيراً أطول من الشهيق ثلاث مرات، ثم اختر تصرفاً صغيراً يعيد لك إحساس السيطرة. لا تحتاج أن تختفي كل المشاعر؛ نحتاج فقط أن تنخفض درجة واحدة.`;
    }

    if (intent === "overwhelm") {
      return `واضح أن ${concern} صار أثقل من طاقتك الآن. لا نرتّب كل شيء مرة واحدة. اكتب أكثر شيء يضغط عليك، ثم اختر منه خطوة مدتها عشر دقائق فقط، واترك الباقي خارج الورقة مؤقتاً. الهدف أن تستعيد بداية الحركة، لا أن تنهي كل الحمل.`;
    }

    if (intent === "sadness") {
      return `أسمع في كلامك وجعاً حول ${concern}. قبل أي نصيحة، خذ لحظة تعترف أن هذا مؤلم فعلاً. الخطوة الصغيرة الآن: اكتب ما الذي احتجته ولم تحصل عليه، ثم اختر شخصاً آمناً أو فعلاً بسيطاً يخفف الوحدة قليلاً خلال اليوم.`;
    }

    return `خلينا نقرر بهدوء بخصوص ${concern}. لا تبحث عن القرار المثالي الآن. اكتب خيارين فقط، ثم اسأل: أي خيار يقلل الضرر؟ وأي خيار أقدر أبدأه بخطوة صغيرة اليوم؟ اختر الخطوة الأقل مقاومة وراجعها بعد ساعة.`;
  }

  if (intent === "anxiety") {
    return `What you are describing sounds like anxiety around ${concern}. Treat it as a body alarm, not proof that you cannot handle it. Try three steps now: name the fear in one sentence, make your exhale longer than your inhale three times, then choose one small action that gives you a bit of control back. The goal is not to erase the feeling; it is to lower it one level.`;
  }

  if (intent === "overwhelm") {
    return `${capitalizeConcern(concern)} sounds heavier than your current capacity. Do not sort the whole thing at once. Write the one pressure that is loudest, choose a ten-minute action inside it, and park everything else outside the page for now. The goal is to restart movement, not carry the whole load perfectly.`;
  }

  if (intent === "sadness") {
    return `I hear pain around ${concern}. Before advice, let it be true that this hurts. A small step now: write what you needed and did not receive, then choose one safe person or one gentle action that reduces the loneliness a little today.`;
  }

  return `Let's decide calmly about ${concern}. Do not chase the perfect choice right now. Write only two options, then ask: which one reduces harm, and which one can I begin with a small step today? Choose the lower-resistance step and review it after an hour.`;
}

function buildGeneralReply(text: string, language: "ar" | "en") {
  const concern = extractConcern(text, language);
  return language === "ar"
    ? `أنا معك. بدل رد عام، خلينا نمسك ${concern} تحديداً: ما أكثر جزء يضغط عليك فيه الآن؟ اكتب جملة واحدة، وبعدها نختار خطوة صغيرة تناسب هذا الجزء فقط.`
    : `I am with you. Instead of a generic answer, let's hold ${concern} specifically: what is the most pressured part of it right now? Name that in one sentence, then we can choose one small step for that part only.`;
}

function extractConcern(text: string, language: "ar" | "en") {
  const cleaned = text
    .replace(/^(what should i do if|what should i do when|what can i do if|what do i do if|what do i do when|i have|i feel|i am feeling|i am|i'm|im|انا|أنا|عندي|اشعر|أشعر|حاسس|حاسة|ماذا أفعل لو|اعمل ايه لو)\s+/i, "")
    .replace(/^(anxiety|fear|worry|panic|قلق|خوف|توتر)\s+(of|about|around|من|حول)\s+/i, "")
    .replace(/^(overwhelmed|stressed|sad|lonely|confused|worried|afraid|scared)\s+(with|about|around|because|from|of)?\s*/i, "")
    .replace(/^(مضغوط|مضغوطة|مرهق|مرهقة|تعبان|تعبانة|زعلان|زعلانة|حزين|حزينة|خايف|خايفة|قلقان|قلقانة)\s*(من|بسبب|حول|و)?\s*/i, "")
    .replace(/^مش قادر(?:ة)?\s+أ?بدأ/i, language === "ar" ? "البدء" : "starting")
    .replace(/^(should i|whether to|if i should|do i)\s+/i, "")
    .replace(/^(being|getting|going|to be)\s+/i, "")
    .replace(/[?.!؟]+$/g, "")
    .trim();

  if (cleaned.length >= 3 && cleaned.length <= 90 && !/^(and|or|but|with|about|because)\b/i.test(cleaned)) return cleaned;
  return language === "ar" ? "هذا الموضوع" : "this situation";
}

function capitalizeConcern(concern: string) {
  return concern.charAt(0).toUpperCase() + concern.slice(1);
}

function applyBehaviorStyle(replyText: string, style: NonNullable<ReflectInput["behaviorStyle"]>, language: "ar" | "en", softerMode?: boolean) {
  if (softerMode) {
    return language === "ar"
      ? `تمام، هخليها أهدى. ${replyText}`
      : `Okay, I will make this softer. ${replyText}`;
  }

  if (style === "deep") {
    return language === "ar"
      ? `${replyText}\n\nالطبقة الأعمق هنا ليست أن تحل كل شيء فورًا، بل أن تعطي نفسك إذنًا تفهم ما يحدث قبل أن تتحرك.`
      : `${replyText}\n\nThe deeper layer here is not solving everything immediately; it is giving yourself permission to understand what is happening before you move.`;
  }

  if (style === "coach") {
    return language === "ar"
      ? `${replyText}\n\nنفّذ الآن: اكتب أول خطوة في سطر واحد، واضبط مؤقت 10 دقائق، ثم قيّم: هل أصبحت أخف بنسبة 1٪؟`
      : `${replyText}\n\nDo this now: write the first step in one line, set a 10-minute timer, then ask: did this get 1% lighter?`;
  }

  if (style === "quick") {
    return language === "ar" ? "أنا معاك. خطوة واحدة الآن، لا أكثر." : "I am with you. One step now, nothing more.";
  }

  return replyText;
}

function isGreeting(text: string) {
  return /^(hi|hey|hello|salam|salaam|السلام عليكم|سلام|اهلا|أهلا|هلا|مرحبا|ازيك|إزيك|عامل ايه|عاملة ايه)[\s!.؟،]*$/i.test(text.trim());
}

function isArabicFollowUp(text: string) {
  return /\b(can be in arabic|in arabic|arabic version|translate.*arabic|make it arabic)\b|بالعربي|عربي|ترجم/i.test(text.trim());
}

function isFlightAnxiety(text: string) {
  return /airplane|aeroplane|plane|flight|flying|takeoff|turbulence|airport|طائرة|طيارة|طيران|رحلة|إقلاع|مطار|مطبات/i.test(text);
}

function isPersonaQuestion(text: string) {
  return /(عم سامي|سامي|omar|عمر|nora|نورا|kareem|كريم|malik|مالك|anonymx|اللاعب الخفي)/i.test(text) && /(ما هي|ما هو|what|tell me|احكي|حكيت|رأيت|شفت|تجربة|موقف|مواقف|حياتك|life|experience|moment)/i.test(text);
}

function buildPersonaQuestionReply(text: string, language: "ar" | "en") {
  if (/عم سامي|سامي/i.test(text)) {
    return language === "ar"
      ? "يا ابني، أكثر المواقف التي رأيتها مؤثرة ليست المواقف الكبيرة التي يصفق لها الناس. أكثر ما بقي في قلبي كان شخصاً عاد بعد انكسار طويل وقال بهدوء: أنا سأحاول مرة أخرى. رأيت ناساً تخسر مالاً، وناساً تفقد مكانتها، وناساً تتعب من داخلها، لكن اللحظة المؤثرة دائماً هي لحظة الصدق: عندما يتوقف الإنسان عن تمثيل القوة، ويبدأ يطلب خطوة صغيرة بكرامة. لو سألتني ماذا تعلمت، أقول لك: الإنسان لا يحتاج أن ينتصر كل يوم؛ يكفي أحياناً أن لا يترك قلبه وحده."
      : "My child, the most moving moments I have seen were not the loud ones people applaud. What stayed with me was a person returning after a long break inside and saying quietly: I will try again. I have seen people lose money, status, and certainty, but the powerful moment is always honesty: when someone stops performing strength and asks for one dignified small step. If you ask what life taught me, I would say this: a person does not need to win every day; sometimes it is enough not to leave their own heart alone.";
  }

  return language === "ar"
    ? "لو سألتني كرفيق، أقول لك إن أكثر المواقف تأثيراً هي التي يظهر فيها الإنسان على حقيقته: خائفاً لكنه يحاول، متعباً لكنه لا يريد أن يقسو على نفسه. هذه اللحظات الصغيرة تكشف قوة أعمق من الكلام الكبير."
    : "If you ask me as a companion, the most moving moments are the ones where a person shows up honestly: afraid but still trying, tired but refusing to become cruel to themselves. Those small moments reveal a deeper strength than dramatic words.";
}

function isCurrentNewsRequest(text: string) {
  return currentNewsPattern.test(text) && !anxietyPattern.test(text) && !sadnessPattern.test(text) && !overwhelmPattern.test(text);
}

function extractNewsTopic(text: string, language: "ar" | "en") {
  const cleaned = text
    .replace(/^(i need to know|i want to know|tell me|show me|give me|what is|what are|عايز اعرف|أريد أن أعرف|قول لي|هات)\s+/i, "")
    .replace(/\b(latest|last|recent|current|today|now|news|updates)\b/gi, "")
    .replace(/\babout\b/gi, "")
    .replace(/(آخر|اخر|أخبار|اخبار|تحديثات|اليوم|حاليا|حالياً)/g, "")
    .replace(/[?.!؟]+$/g, "")
    .trim();

  if (cleaned.length >= 3 && cleaned.length <= 80) return cleaned;
  return language === "ar" ? "كأس العالم" : "World Cup";
}

function buildCurrentNewsReply(topic: string, language: "ar" | "en") {
  return language === "ar"
    ? `هذا طلب أخبار حية عن ${topic}، وليس فضفضة. في نسخة العرض المجانية لا أتحقق من الأخبار المباشرة من الإنترنت داخل الرد، لذلك الأفضل فتح مصادر موثوقة الآن: موقع FIFA الرسمي، صفحة Google News للموضوع، أو حسابات البطولة الرسمية. الخطوة السريعة: ابحث عن "${topic} latest news" ثم تأكد من تاريخ الخبر قبل الاعتماد عليه.`
    : `That is a live news request about ${topic}, not a venting moment. In the free demo I do not verify live internet updates inside the reply, so use a current source now: FIFA.com, Google News, or official tournament accounts. Quick step: search "${topic} latest news" and check the article date before trusting it.`;
}

function inferPreviousTopic(messages: ReflectInput["recentMessages"]) {
  if (!messages) return undefined;

  for (const message of [...messages].reverse()) {
    if (/mohamed ali|muhammad ali|mohammad ali|محمد علي|محمد على/i.test(message.text)) {
      return "mohamed-ali";
    }
  }

  return undefined;
}

function findPreviousAssistantText(messages: ReflectInput["recentMessages"]) {
  return [...(messages || [])]
    .reverse()
    .find((message) => message.role === "assistant" && !isGreeting(message.text))
    ?.text;
}

function inferPreviousLearningTopic(messages: ReflectInput["recentMessages"]) {
  if (!messages) return undefined;

  for (const message of [...messages].reverse()) {
    if (message.role !== "user") continue;

    const explicitTopic = extractTopic(message.text);
    if (explicitTopic && !/^(this topic|الموضوع)$/i.test(explicitTopic)) return explicitTopic;

    const devopsTopic = message.text.match(/\b(devops|docker|kubernetes|jenkins|github actions|gitlab ci|ci\/cd|terraform|ansible|linux|aws|azure|gcp)\b/i)?.[1];
    if (devopsTopic) return devopsTopic;
  }

  return undefined;
}

function buildStoryReply(text: string, language: "ar" | "en", messages: ReflectInput["recentMessages"]) {
  const storyCount = (messages || []).filter((message) => message.role === "assistant" && message.world === "story").length;
  const wantsStronger = /strong|stronger|intense|deep|powerful|أقوى|اقوى|عميق|مؤثر/i.test(text);
  const wantsAnother = /another|again|more|different|واحدة كمان|واحده كمان|كمان|غيرها/i.test(text);
  const variant = wantsStronger ? "strong" : wantsAnother || storyCount > 0 ? "second" : "first";

  if (language === "ar") {
    if (variant === "strong") {
      return "في محطة قطار مهجورة، وقف شخص يحمل حقيبة لا يعرف متى امتلأت بكل هذا الثقل. كان القطار الأخير يوشك أن يرحل، والناس حوله يركضون كأنهم يعرفون طريقهم تماماً. هو وحده بقي ثابتاً، لا لأنه ضعيف، بل لأنه تعب من التظاهر بالقوة. فتح الحقيبة أخيراً، فلم يجد وحوشاً كما تخيل؛ وجد رسائل قديمة، واعتذارات لم تُقل، وأحلاماً تركها تنتظر. مزق ورقة واحدة فقط، لا كلها. وفجأة صار قادراً أن يخطو. لم يتغير العالم، لكنه فهم شيئاً حاسماً: أحياناً لا تبدأ النجاة عندما تحمل أكثر، بل عندما تترك شيئاً واحداً لا يخصك.";
    }

    if (variant === "second") {
      return "كان هناك منارة على طرف بحر قاسٍ، ضوؤها لا يوقف العاصفة لكنه يمنع السفن من نسيان الاتجاه. في الداخل جلس الحارس، منهكاً، يظن أن نوره صغير جداً أمام كل هذا الظلام. وفي ليلة اشتد فيها الموج، رأى سفينة بعيدة تغيّر مسارها ببطء بسبب ومضة واحدة منه. لم يصفق له أحد، ولم يعرف اسمه أحد، لكنه ابتسم للمرة الأولى منذ أيام. فهم أن بعض الأثر لا يحتاج ضجيجاً؛ يكفي أن تكون ثابتاً في لحظة كان يمكن أن ينطفئ فيها كل شيء.";
    }

    return "في مدينة قديمة كانت النوافذ فيها تحفظ أسرار أصحابها، عاش شاب يخبئ تعبه في جيبه كأنه مفتاح صدئ. كل صباح يبتسم للناس، وكل مساء يعود وفي صدره سوق كامل من الأصوات. وفي ليلة مطر، جلس أمام كوب شاي بارد، وكتب على ورقة صغيرة: لا أحتاج أن أنتصر على حياتي كلها الليلة؛ يكفيني أن أفتح نافذة واحدة. فتح النافذة، فدخل هواء خفيف، ليس كافيًا ليغيّر العالم، لكنه كان كافيًا ليذكّره أن القلب لا يحتاج معجزة دائمًا؛ أحيانًا يحتاج مكانًا صغيرًا يتنفس فيه.";
  }

  if (variant === "strong") {
    return "At an abandoned train station, someone stood with a suitcase they no longer remembered packing. The last train was nearly leaving, and everyone around them moved like they knew exactly where they belonged. They stayed still, not because they were weak, but because they were tired of pretending to be strong. At last, they opened the suitcase. Inside were not monsters, but old apologies, unfinished dreams, and names they had carried for too long. They removed one letter and left it on the platform. The train did not wait forever, but this time they stepped on lighter. The world did not become easy. They simply learned that survival sometimes begins by putting down one thing that was never yours to carry.";
  }

  if (variant === "second") {
    return "There was a lighthouse at the edge of a violent sea. Its light could not stop the storm, but it kept ships from forgetting direction. Inside, the keeper sat exhausted, convinced his small beam meant nothing against that much darkness. Then, near midnight, he saw one distant vessel turn because of a single flash from his tower. No one applauded. No one knew his name. Still, he smiled for the first time in days. He understood that some forms of strength are quiet: staying lit for one more minute when everything around you expects you to go out.";
  }

  return "In an old city where windows kept the secrets of their owners, a young person carried exhaustion like a rusted key in their pocket. Every morning they smiled for people, and every night they returned with a whole market of noise inside their chest. One rainy evening, beside a cold cup of tea, they wrote: I do not need to defeat my whole life tonight; I only need to open one window. They opened it. The air that entered did not change the world, but it reminded them that the heart does not always need a miracle. Sometimes it only needs one small place to breathe.";
}

function mohamedAliStory(language: "ar" | "en") {
  return language === "ar"
    ? "في أوائل القرن التاسع عشر، كانت مصر خارجة من دوامة طويلة: مماليك يتنازعون، عثمانيون يحاولون استعادة السيطرة، وذاكرة الحملة الفرنسية لا تزال قريبة. وسط هذا الارتباك ظهر محمد علي باشا، ضابط ألباني جاء مع الجيش العثماني، لكنه قرأ اللحظة بذكاء نادر. لم يكتف بأن يكون رجل حرب؛ بنى جيشًا حديثًا، أرسل بعثات للتعلم، فتح مدارس ومصانع، وربط الزراعة والقطن بمشروع دولة يريد أن يقف على قدميه. لذلك يسميه كثيرون مؤسس مصر الحديثة. لكن القصة ليست بطولة صافية؛ صعوده كان شديد المركزية، وقوته صنعت دولة قوية لكنها ضغطت على الناس من أعلى. حكاية محمد علي تترك لنا سؤالًا لا يزال حيًا: كيف نبني نهضة حقيقية من غير أن ننسى الإنسان الذي نحاول النهوض باسمه؟"
    : "In the early 1800s, Mohamed Ali Basha rose in Egypt after years of conflict between Ottoman forces, Mamluks, and the French. He began as an officer, then built a state project: an army, schools, factories, student missions abroad, and an economy pushed by cotton. Many call him the founder of modern Egypt, but the story has a hard edge. His power was forceful and centralized. His life asks an old question: how much does a nation pay when one man builds strength from the top down?";
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

function buildNewsResources(topic: string) {
  return [
    {
      title: `FIFA updates for ${topic}`,
      type: "article" as const,
      url: `https://www.fifa.com/search?query=${encodeURIComponent(topic)}`,
      summary: `Use FIFA as the first official source for current ${topic} announcements, fixtures, and tournament updates.`,
    },
    {
      title: `Latest news for ${topic}`,
      type: "article" as const,
      url: `https://news.google.com/search?q=${encodeURIComponent(`${topic} latest news`)}`,
      summary: `Check publication dates and compare more than one source before treating ${topic} news as confirmed.`,
    },
  ];
}
