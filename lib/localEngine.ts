import { inferWorld } from "./modes";
import { extractLearningTopic, getLearningResources, type LearningResource } from "./research";
import { detectSafety } from "./safety";
import type { WorldId } from "./worlds";

export type EngineMessage = {
  role: "user" | "assistant";
  text: string;
  worldId: WorldId;
};

export type EngineResult = {
  worldId: WorldId;
  text: string;
  resources?: LearningResource[];
  safetyTriggered?: boolean;
};

const continuationPattern = /^(another one|one more|again|more|continue|كمل|كملي|كمان|واحدة كمان|واحده كمان|تاني|تانية|تانيه|مرة كمان|مره كمان)$/i;

const replies: Record<WorldId, { ar: string[]; en: string[] }> = {
  calm: {
    ar: [
      "أنا سامعك. خلينا نبطئ اللحظة ونفصل الشعور عن القرار. أول خطوة: سمّ الشيء الأثقل الآن بكلمة واحدة، ثم اختر فعلًا صغيرًا يمكن عمله خلال عشر دقائق.",
      "تمام. مش لازم نحل كل حاجة مرة واحدة. اكتب الجملة التي تضغط عليك، وبعدها نختار منها شيء واحد تحت سيطرتك الآن.",
    ],
    en: [
      "I hear you. Let's slow the moment down and separate the feeling from the decision. First step: name the heaviest thing in one word, then choose one action you can do in ten minutes.",
      "You do not have to solve the whole thing at once. Write the sentence that feels loudest, then we will pick one piece that is actually within reach.",
    ],
  },
  story: {
    ar: [
      "كان فيه ولد بيمشي كل يوم شايل شنطة تقيلة، وكل ما حد يسأله يقول: عادي، دي حاجات بسيطة. في يوم قعد تحت شباك قديم، وطلع من الشنطة حجر صغير مكتوب عليه خوف، وحجر تاني مكتوب عليه لازم أكون قوي. لما ساب حجر واحد على الأرض، الطريق ما اتحلش كله، بس رجله عرفت تتحرك. أحيانًا البداية مش إننا نفهم الحكاية كلها، البداية إننا ننزل حمل واحد بس.",
      "في قرية صغيرة كان فيه نجار عجوز بيصلح الأبواب اللي الناس افتكرتها انتهت. كل باب كان يوصله مكسور من ناحية مختلفة. لما سألوه إزاي بتعرف تصلحهم، قال: أنا ما ببدأش بالقفل. ببدأ بأن الباب لسه عايز يفتح. وفي يوم، فهم شاب كان واقف جنبه إن قلبه هو كمان مش محتاج يتغير كله مرة واحدة، محتاج مفصلة صغيرة ترجع تتحرك.",
      "كانت بنت صغيرة بتجمع الضوء في علبة زجاج، وكل ما الدنيا تضيق تفتح العلبة شوية. في ليلة طويلة، لقت العلبة فاضية. زعلت، وبعدين اكتشفت إن الضوء ماكانش جوه العلبة أصلًا؛ كان في الطريق اللي مشيته وهي بتدور عليه. من يومها بطلت تخاف من الليالي الفاضية، لأنها عرفت إن الخطوة نفسها ممكن تنور.",
      "في بلد بعيدة كانت فيه بحيرة بتتكلم. اللي يوقف عند ضفتها يسمع صدى كلامه بس بعد ثلاث ثواني. في يوم جه رجل زعلان صرخ: 'أنا مش قادر كمان.' سمع صوته يرجعله بعد ثلاث ثواني يقول: 'أنا مش قادر كمان.' ضحك رغم نفسه، لأنه لأول مرة حس إن حد سمعه بالظبط من غير ما يغير الكلام.",
      "كان فيه شاعر بيكتب قصائد بس ما بيكملهاش أبدًا. لما سألوه ليه، قال: 'لأن اللحظة اللي بتكتمل فيها بتبقى ملك الورقة مش ملكي أنا.' في يوم واحد كتب جملة واحدة بس وأضاف نقطة في الآخر: لما توقف الريح، الشجر هو اللي بيفضل قاعد. حسّ إنه وصّل كل حاجة.",
      "كانت امرأة قديمة بتزرع بذور في أرض ما حد اتوقع منها حاجة. جيرانها قالوا لها الأرض دي ما بتنبتش. ردت: 'أنا مش بزرع عشان الأرض، أنا بزرع عشان أنا.' في الموسم الجاي، حاجة صغيرة أخضر طلعت. الجيران سألوا: 'إزاي؟' قالت: 'الأرض فهمت إني جادة.'",
    ],
    en: [
      "There was a boy who walked everywhere with a heavy bag. Whenever someone asked, he said, 'It's nothing, just small things.' One evening he sat under an old window and took out one stone labeled fear, then another labeled I must be strong. When he left just one stone on the ground, the road did not become easy, but his feet remembered how to move. Sometimes the beginning is not understanding the whole story. It is putting down one weight.",
      "In a small village, an old carpenter repaired doors everyone thought were finished. Some had broken hinges, some had cracked wood, some had stubborn locks. When someone asked how he knew where to start, he said, 'I do not start with the lock. I start with the fact that the door still wants to open.' A young person nearby understood: a heart does not always need to be rebuilt. Sometimes one hinge needs to move again.",
      "A girl used to collect light in a glass jar. Whenever the world felt narrow, she opened it a little. One long night, the jar was empty. She cried, then noticed the light had never really lived inside the jar. It had been gathering on the path she walked while searching for it. After that, empty nights scared her less, because she knew a step could also shine.",
      "There was a lake in a distant country that would speak back. Anyone who stood at its edge heard their own words return after exactly three seconds. One day an angry man came and shouted: 'I cannot go on.' The lake replied three seconds later: 'I cannot go on.' He laughed despite himself, because for the first time something had heard him exactly, without editing a single word.",
      "A poet wrote verses but never finished any of them. When asked why, he said: 'Because the moment it is complete it belongs to the page, not to me.' One day he wrote a single sentence and added a period: When the wind stops, the trees are the ones that stay. He felt he had said everything.",
      "An old woman planted seeds in land no one expected anything from. Her neighbors said the soil was too tired. She replied: 'I do not plant for the soil. I plant for myself.' The following season, something small and green appeared. The neighbors asked how. She said: 'The earth understood I was serious.'",
    ],
  },
  poetry: {
    ar: ["الضجيج ليس عدوك كله. بعضه موجة تطلب اسمًا. اترك الجملة الأثقل تنزل على الورق، ثم اختر جملة أخف تمشي معها اليوم."],
    en: ["Not all noise is the enemy. Some of it is a wave asking for a name. Let the heaviest sentence land on the page, then choose a lighter sentence to walk with today."],
  },
  faith: {
    ar: ["ربنا قريب من القلب المتعب. خذ لحظة سكينة، وابدأ بخطوة رحيمة بنفسك: وضوء، دعاء قصير، أو رسالة لشخص آمن."],
    en: ["Let this be a quiet minute, not a performance. Take one merciful step: breathe, pray if that is yours, or send one honest message to a safe person."],
  },
  learning: {
    ar: ["خلينا نحول السؤال إلى مسار تعلم. حدد ما تعرفه، وما يربكك، ومصدرًا واحدًا تبدأ به. بعد ذلك نلخصه إلى ثلاث نقاط قابلة للمراجعة."],
    en: ["Let's turn this into a learning path. Name what you already know, what is confusing, and one source to start from. Then reduce it into three reviewable points."],
  },
  build: {
    ar: ["نحوّل الفوضى إلى نظام: 1. اكتب الهدف. 2. احذف غير الضروري. 3. اختر مهمة واحدة مدتها 15 دقيقة. التنفيذ الصغير أهم من الخطة الكبيرة."],
    en: ["Let's turn the mess into a system: 1. Write the goal. 2. Remove what is not needed. 3. Pick one 15-minute task. Small execution beats a perfect plan."],
  },
  celebration: {
    ar: ["هذا يستحق أن يتسجل. لا تتجاوز الفرحة بسرعة. خذ دقيقة لتسمي ما فعلته جيدًا، ثم اختر طريقة بسيطة تثبت هذا التقدم."],
    en: ["This deserves to be noticed. Do not rush past the good news. Take one minute to name what you did well, then choose a small way to protect that progress."],
  },
  grief: {
    ar: ["لن نستعجل هذا الشعور. ابقَ مع الشيء الأقرب للتنفس الآن: كوب ماء، مكان هادئ، وشخص واحد يمكن أن يعرف أنك لست بخير."],
    en: ["We will not rush this feeling. Stay with what is closest to breathing right now: water, a quieter place, and one person who can know you are not okay."],
  },
};

export function reflectLocally(text: string, history: EngineMessage[]): EngineResult {
  const safety = detectSafety(text);
  if (safety.triggered) {
    return { worldId: "grief", text: safety.text, safetyTriggered: true };
  }

  const translationLanguage = getTranslationLanguage(text);
  if (translationLanguage) {
    const previousUserText = [...history].reverse().find((message) => message.role === "user")?.text ?? text;
    const previousWorldId = [...history].reverse().find((message) => message.role === "assistant")?.worldId ?? inferWorld(previousUserText);
    const learningTopic = getLearningTopic(previousUserText, history);

    return {
      worldId: previousWorldId,
      text: pickReply(previousWorldId, translationLanguage, history, learningTopic, previousUserText),
      resources: previousWorldId === "learning" ? getLearningResources(learningTopic ?? previousUserText) : undefined,
    };
  }

  const language = detectLanguage(text);
  const latestAssistantWorldId = [...history].reverse().find((message) => message.role === "assistant")?.worldId ?? "calm";
  const worldId = continuationPattern.test(text.trim()) ? latestAssistantWorldId : inferWorld(text);
  const learningTopic = getLearningTopic(text, history);
  const resources = worldId === "learning" || isStudyPlanRequest(text, learningTopic) ? getLearningResources(learningTopic ?? text) : undefined;

  return {
    worldId,
    text: pickReply(worldId, language, history, learningTopic, text),
    resources,
  };
}

export function rerenderWorld(worldId: WorldId, history: EngineMessage[]): EngineResult {
  const lastUserText = [...history].reverse().find((message) => message.role === "user")?.text ?? "";
  const language = detectLanguage(lastUserText);

  return {
    worldId,
    text: pickReply(worldId, language, history, getLearningTopic(lastUserText, history), lastUserText),
    resources: worldId === "learning" ? getLearningResources(lastUserText) : undefined,
  };
}

function pickReply(worldId: WorldId, language: "ar" | "en", history: EngineMessage[], learningTopic?: string, text?: string) {
  if (worldId === "build" && isStudyPlanRequest(text ?? "", learningTopic)) {
    return buildStudyPlanReply(language, learningTopic ?? (language === "ar" ? "المادة" : "the subject"));
  }

  if (worldId === "story") {
    const historicalStory = getHistoricalStory(text ?? "", language);
    if (historicalStory) return historicalStory;
  }

  const pool = replies[worldId][language];
  const count = history.filter((message) => message.role === "assistant" && message.worldId === worldId).length;
  return pool[count % pool.length];
}

function getLearningTopic(text: string, history: EngineMessage[]) {
  const currentTopic = extractLearningTopic(text);
  if (currentTopic) return currentTopic;

  const previousLearningPrompt = [...history]
    .reverse()
    .find((message) => message.role === "user" && (message.worldId === "learning" || /learn|study|english|ذاكر|اتعلم|تعلم/i.test(message.text)));

  return previousLearningPrompt ? extractLearningTopic(previousLearningPrompt.text) : undefined;
}

function isStudyPlanRequest(text: string, learningTopic?: string) {
  return Boolean(learningTopic && /plan|schedule|routine|خطة|خطه|جدول/i.test(text));
}

function buildStudyPlanReply(language: "ar" | "en", topic: string) {
  if (language === "ar") {
    return `خطة بسيطة لـ ${topic}: 1. عشر دقائق مراجعة كلمات أو مفاهيم أساسية. 2. خمس عشرة دقيقة تدريب عملي بصوت عالي أو كتابة قصيرة. 3. خمس دقائق تسجيل الأخطاء في قائمة واحدة. كررها 5 أيام، وفي اليوم السادس اختبر نفسك بدل ما تضيف محتوى جديد.`;
  }

  return `Here is a simple plan for ${topic}: 1. Spend 10 minutes reviewing core words or concepts. 2. Spend 15 minutes practicing actively, speaking or writing instead of only reading. 3. Spend 5 minutes logging mistakes in one list. Repeat for 5 days, then use day 6 to test yourself instead of adding new material.`;
}

function getTranslationLanguage(text: string): "ar" | "en" | undefined {
  const normalized = text.toLowerCase().trim();

  if (/(convert|translate|say it|rewrite).*(arabic|عربي)|^(arabic|عربي|بالعربي|بالعربية)$/.test(normalized)) return "ar";
  if (/(convert|translate|say it|rewrite).*(english|انجليزي|إنجليزي)|^(english|انجليزي|إنجليزي|بالانجليزي|بالإنجليزي)$/.test(normalized)) return "en";

  return undefined;
}

function getHistoricalStory(text: string, language: "ar" | "en") {
  const normalized = text.toLowerCase();
  const asksForMohamedAli = /mohamed ali|muhammad ali|mohammad ali|محمد علي|محمد على/.test(normalized);

  if (!asksForMohamedAli) return undefined;

  if (language === "ar") {
    return "في أوائل القرن التاسع عشر، وصل محمد علي باشا إلى مصر كضابط عثماني، لكن القصة لم تقف عند رتبة عسكرية. بعد سنوات من الاضطراب بين المماليك والعثمانيين والفرنسيين، بدأ يبني سلطة جديدة من القاهرة. لم يكن مشروعه مجرد حكم؛ كان يحاول أن يصنع دولة أقوى: جيش منظم، مدارس، مصانع، وزراعة قطن تغيّر اقتصاد البلد. وفي الحكاية جانب مظلم أيضًا: صعوده كان قاسيًا، وقراراته لم تكن رحيمة دائمًا. لذلك تُروى قصة محمد علي باشا كقصة رجل بنى مصر الحديثة من ناحية، وفتح سؤالًا صعبًا من ناحية أخرى: كم ثمن بناء القوة عندما تأتي من يد واحدة؟";
  }

  return "In the early 1800s, Mohamed Ali Basha arrived in Egypt as an Ottoman officer, but his story did not stay inside a soldier's rank. Egypt was unstable after years of conflict between Ottoman forces, Mamluks, and the French. From Cairo, he slowly built a new kind of power. He organized an army, sent students to learn abroad, opened schools and factories, and pushed agriculture, especially cotton, into the center of the economy. That is why many people call him the founder of modern Egypt. But the story has a hard edge too: his rise was forceful, and his rule could be ruthless. So the old story of Mohamed Ali Basha is not only about ambition. It is about the price of building a strong state when one man holds too much power.";
}

function detectLanguage(text: string): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}
