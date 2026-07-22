import type { PersonaId } from "./personas";

export type ChildStoryAgeBand = "4-6" | "7-9" | "10-12";

export type ChildStory = {
  id: string;
  personaId: PersonaId;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  ageBand: ChildStoryAgeBand;
  readingMinutes: number;
  posterClassName: string;
  posterGlyph: string;
  backgroundPrompt: string;
  pagesEn: string[];
  pagesAr: string[];
  tapChoicesEn: string[];
  tapChoicesAr: string[];
};

export const childStories: ChildStory[] = [
  {
    id: "moon-key-riddle",
    personaId: "rami_riddles",
    titleEn: "The Moon Key Riddle",
    titleAr: "لغز مفتاح القمر",
    subtitleEn: "A silver key appears only when three clever guesses wake the moon gate.",
    subtitleAr: "مفتاح فضي لا يظهر إلا عندما توقظ ثلاث إجابات ذكية بوابة القمر.",
    ageBand: "7-9",
    readingMinutes: 4,
    posterClassName: "from-[#12343b] via-[#1f5f63] to-[#f0c36a]",
    posterGlyph: "☾",
    backgroundPrompt: "A moonlit puzzle garden with a glowing silver key, soft teal shadows, golden firefly dots, and rounded child-safe fantasy shapes.",
    pagesEn: [
      "Rami found a tiny door drawn on the night sky. It had no handle, only three sleepy stars blinking like buttons.",
      "The first star whispered, 'I am full of holes but still hold water.' Rami smiled. 'A sponge!' The star spun open with a soft click.",
      "The second star asked, 'What gets bigger when you take something away?' Rami tapped his chin. 'A hole!' The moon gate shimmered brighter.",
      "The last star did not speak. It showed a shadow shaped like a key. Rami guessed, 'The answer is curiosity.' The sky-door opened, and inside was a note: 'Every good question is already a key.'"
    ],
    pagesAr: [
      "وجد رامي باباً صغيراً مرسوماً على سماء الليل. لم يكن له مقبض، بل ثلاث نجمات ناعسات تلمع مثل الأزرار.",
      "همست النجمة الأولى: «أنا مليئة بالثقوب، ومع ذلك أحمل الماء». ابتسم رامي: «الإسفنجة!» فدارت النجمة وانفتحت بنقرة لطيفة.",
      "سألت النجمة الثانية: «ما الشيء الذي يكبر عندما نأخذ منه؟» حك رامي ذقنه وقال: «الحفرة!» فأضاءت بوابة القمر أكثر.",
      "النجمة الأخيرة لم تتكلم. أظهرت ظلاً يشبه المفتاح. قال رامي: «الإجابة هي الفضول». انفتح باب السماء، ووجد ورقة تقول: «كل سؤال جيد هو مفتاح بالفعل»."
    ],
    tapChoicesEn: ["Give me a riddle!", "I want a hint", "Open the moon gate"],
    tapChoicesAr: ["أعطني لغزاً!", "أريد تلميحاً", "افتح بوابة القمر"],
  },
  {
    id: "cloud-stage-show",
    personaId: "deema_drama",
    titleEn: "The Cloud Stage Show",
    titleAr: "مسرح الغيمة",
    subtitleEn: "Three shy clouds learn how to become brave actors without shouting.",
    subtitleAr: "ثلاث غيمات خجولات يتعلمن كيف يصبحن ممثلات شجاعات بلا صراخ.",
    ageBand: "4-6",
    readingMinutes: 3,
    posterClassName: "from-[#334e68] via-[#7fb3d5] to-[#f7d9a3]",
    posterGlyph: "☁",
    backgroundPrompt: "A floating cloud theater with warm lanterns, velvet blue curtains, smiling cloud shapes, and a safe bedtime-story atmosphere.",
    pagesEn: [
      "Deema opened a tiny theater on a cloud. The curtain was made of blue rain, and the seats were soft as pillows.",
      "Three clouds wanted to act, but each one puffed smaller when it was their turn. Deema said, 'No big voice needed. Try one brave whisper.'",
      "The first cloud whispered like a drum. The second cloud bowed like a moon. The third cloud made a rain-sparkle sound: tap, tap, tada!",
      "The audience clapped softly so nobody felt scared. The clouds learned that brave can be small, gentle, and still bright."
    ],
    pagesAr: [
      "فتحت ديما مسرحاً صغيراً فوق غيمة. كانت الستارة من مطر أزرق، والكراسي ناعمة مثل الوسائد.",
      "أرادت ثلاث غيمات أن يمثلن، لكن كل غيمة صارت أصغر عندما جاء دورها. قالت ديما: «لا نحتاج صوتاً عالياً. جربي همسة شجاعة واحدة».",
      "همست الغيمة الأولى مثل طبلة. انحنت الثانية مثل قمر. أما الثالثة فأصدرت صوت مطر لامع: طق، طق، تادا!",
      "صفق الجمهور بهدوء حتى لا تخاف أي غيمة. وتعلمت الغيمات أن الشجاعة قد تكون صغيرة ولطيفة ومضيئة أيضاً."
    ],
    tapChoicesEn: ["Pick my role", "Make a funny scene", "Curtain up!"],
    tapChoicesAr: ["اختر دوري", "اصنع مشهداً مضحكاً", "افتح الستارة!"],
  },
  {
    id: "planet-popcorn",
    personaId: "sami_space",
    titleEn: "Planet Popcorn",
    titleAr: "كوكب الفشار",
    subtitleEn: "A tiny rocket lands on a planet where every crater asks a science question.",
    subtitleAr: "صاروخ صغير يهبط على كوكب تسأل فيه كل حفرة سؤالاً علمياً.",
    ageBand: "7-9",
    readingMinutes: 4,
    posterClassName: "from-[#19173d] via-[#4f46a5] to-[#ffb703]",
    posterGlyph: "✦",
    backgroundPrompt: "A bright child-safe space poster with a tiny rocket, popcorn-shaped planets, purple sky, amber stars, and soft rounded craters.",
    pagesEn: [
      "Sami's rocket landed with a gentle poof on Planet Popcorn. The ground bounced, but only a little, like a sleepy trampoline.",
      "A crater popped open and asked, 'Why do astronauts float?' Sami pointed at a small pebble drifting by. 'Because gravity is much weaker up here.'",
      "Another crater asked, 'Can we look at the sun?' Sami shook his helmet. 'Never with eyes alone. Safe science protects curious eyes.'",
      "The biggest crater offered a golden popcorn star. It said, 'Curiosity is fuel. Safety is the rocket seatbelt.' Sami flew home with both."
    ],
    pagesAr: [
      "هبط صاروخ سامي بنفخة لطيفة على كوكب الفشار. ارتجت الأرض قليلاً كأنها ترامبولين ناعس.",
      "انفتحت حفرة وسألت: «لماذا يطفو رواد الفضاء؟» أشار سامي إلى حجر صغير يسبح بجواره: «لأن الجاذبية هنا أضعف بكثير».",
      "سألت حفرة أخرى: «هل ننظر إلى الشمس؟» هز سامي خوذته: «لا ننظر إليها بالعين أبداً. العلم الآمن يحمي العيون الفضولية».",
      "أهدته أكبر حفرة نجمة فشار ذهبية وقالت: «الفضول وقود. والأمان حزام مقعد الصاروخ». عاد سامي إلى البيت ومعه الاثنان."
    ],
    tapChoicesEn: ["Launch a mission", "Ask a planet", "Space quiz!"],
    tapChoicesAr: ["أطلق مهمة", "اسأل كوكباً", "اختبار فضائي!"],
  },
  {
    id: "kindness-bridge",
    personaId: "amina_manners",
    titleEn: "The Kindness Bridge",
    titleAr: "جسر اللطف",
    subtitleEn: "Two friends repair a wobbly bridge with careful words and one brave apology.",
    subtitleAr: "صديقان يصلحان جسراً مهتزاً بكلمات هادئة واعتذار شجاع.",
    ageBand: "7-9",
    readingMinutes: 4,
    posterClassName: "from-[#2f5d50] via-[#8fb996] to-[#f4d35e]",
    posterGlyph: "♡",
    backgroundPrompt: "A warm bridge over a gentle stream, paper lanterns, soft green hills, gold sunlight, and child-safe friendship symbols.",
    pagesEn: [
      "Amina saw two friends standing on opposite sides of a little wooden bridge. The bridge wobbled whenever they used sharp words.",
      "One friend said, 'You broke my tower.' The other crossed their arms. Amina placed a kindness stone on the bridge and asked, 'Which sentence helps repair?'",
      "They tried, 'I felt sad when the tower fell. Can we rebuild it together?' The bridge stopped wobbling.",
      "A tiny bell rang under the wood. The bridge had a rule: kind words do not erase mistakes, but they make room to fix them."
    ],
    pagesAr: [
      "رأت أمينة صديقين يقفان على جانبي جسر خشبي صغير. كان الجسر يهتز كلما استخدما كلمات حادة.",
      "قال أحدهما: «أنت كسرت برجي». عقد الآخر ذراعيه. وضعت أمينة حجراً لطيفاً على الجسر وسألت: «أي جملة تساعدنا على الإصلاح؟»",
      "جربا: «حزنت عندما وقع البرج. هل نعيد بناءه معاً؟» فتوقف الجسر عن الاهتزاز.",
      "رن جرس صغير تحت الخشب. كان للجسر قانون: الكلمات اللطيفة لا تمحو الخطأ، لكنها تفتح مكاناً لإصلاحه."
    ],
    tapChoicesEn: ["Pick kind words", "Practice apology", "Repair the bridge"],
    tapChoicesAr: ["اختر كلمات لطيفة", "تدريب اعتذار", "أصلح الجسر"],
  },
  {
    id: "button-bug-debug",
    personaId: "leila_logic",
    titleEn: "The Button Bug Debug",
    titleAr: "تصحيح حشرة الأزرار",
    subtitleEn: "A robot keeps dancing backward until Leila finds the missing step.",
    subtitleAr: "روبوت يرقص للخلف حتى تجد ليلى الخطوة المفقودة.",
    ageBand: "10-12",
    readingMinutes: 5,
    posterClassName: "from-[#102a43] via-[#2f80ed] to-[#7bdff2]",
    posterGlyph: "{ }",
    backgroundPrompt: "A playful coding workshop with a friendly robot, glowing block-code tiles, blue circuits, and rounded safe shapes.",
    pagesEn: [
      "Leila built a robot named Button. Button was supposed to wave, spin, and bow. Instead, Button walked backward into a pillow pile.",
      "Leila checked the code blocks: Step forward. Spin. Bow. Wave. Something felt out of order. Button beeped, 'I obey exactly, even when exactly is silly.'",
      "Leila moved 'Step forward' before 'Wave' and added 'Stop after bow.' Button tried again: wave, step, spin, bow, stop.",
      "The workshop lights flashed blue. Debugging did not mean the robot was bad. It meant the instructions were learning how to become clear."
    ],
    pagesAr: [
      "بنت ليلى روبوتاً اسمه زرار. كان المفروض أن يلوح ويدور وينحني. لكنه مشى للخلف داخل كومة وسائد.",
      "راجعت ليلى كتل الكود: خطوة للأمام. دوران. انحناء. تلويح. كان هناك شيء في غير مكانه. قال زرار: «أنا أنفذ بالضبط، حتى لو كان الضبط مضحكاً».",
      "نقلت ليلى «خطوة للأمام» قبل «التلويح»، وأضافت «توقف بعد الانحناء». جرب زرار: تلويح، خطوة، دوران، انحناء، توقف.",
      "أضاءت الورشة باللون الأزرق. التصحيح لا يعني أن الروبوت سيئ. بل يعني أن التعليمات تتعلم كيف تصبح أوضح."
    ],
    tapChoicesEn: ["Find the bug", "Move a block", "Run again!"],
    tapChoicesAr: ["ابحث عن الخطأ", "حرّك كتلة", "شغّل مرة أخرى!"],
  },
  {
    id: "tiny-room-rocket",
    personaId: "kareem_kick",
    titleEn: "The Tiny Room Rocket",
    titleAr: "صاروخ الغرفة الصغيرة",
    subtitleEn: "A messy room becomes a launch pad after three tiny habit quests.",
    subtitleAr: "غرفة غير مرتبة تتحول إلى منصة صاروخ بعد ثلاث مهام صغيرة.",
    ageBand: "4-6",
    readingMinutes: 3,
    posterClassName: "from-[#6b2d2d] via-[#d65a31] to-[#ffd166]",
    posterGlyph: "↗",
    backgroundPrompt: "A cozy child bedroom turning into a pretend rocket launch pad, warm orange light, safe toys, tidy shelves, and energetic movement lines.",
    pagesEn: [
      "Kareem found a rocket hiding under socks, blocks, and one very confused slipper. 'Kick-off!' he said. 'A launch pad needs three tiny quests.'",
      "Quest one: put three blocks in the box. Quest two: send socks to the laundry moon. Quest three: park the slipper beside its twin.",
      "The rocket was only a pillow and blanket, but the room felt ready. Kareem counted down from five with a grin.",
      "The launch was quiet, safe, and imaginary. The best part was not the rocket. It was knowing a big mess can begin with one tiny move."
    ],
    pagesAr: [
      "وجد كريم صاروخاً مختبئاً تحت الجوارب والمكعبات وفردة حذاء حائرة جداً. قال: «انطلاق!» منصة الصاروخ تحتاج ثلاث مهام صغيرة.",
      "المهمة الأولى: ضع ثلاثة مكعبات في الصندوق. الثانية: أرسل الجوارب إلى قمر الغسيل. الثالثة: أوقف فردة الحذاء بجانب توأمها.",
      "كان الصاروخ مجرد وسادة وبطانية، لكن الغرفة شعرت أنها جاهزة. عد كريم من خمسة وهو يبتسم.",
      "كان الانطلاق هادئاً وآمناً وخيالياً. أجمل ما في الأمر لم يكن الصاروخ، بل معرفة أن الفوضى الكبيرة تبدأ بخطوة صغيرة."
    ],
    tapChoicesEn: ["Start tiny quest", "I did it!", "Give easier quest"],
    tapChoicesAr: ["ابدأ مهمة صغيرة", "أنجزتها!", "مهمة أسهل"],
  },
  {
    id: "color-museum-door",
    personaId: "mona_museum",
    titleEn: "The Color Museum Door",
    titleAr: "باب متحف الألوان",
    subtitleEn: "A blank door opens only when Mona mixes three feelings into colors.",
    subtitleAr: "باب فارغ لا ينفتح إلا عندما تمزج منى ثلاثة مشاعر داخل ألوان.",
    ageBand: "7-9",
    readingMinutes: 4,
    posterClassName: "from-[#3d405b] via-[#81b29a] to-[#f2cc8f]",
    posterGlyph: "◐",
    backgroundPrompt: "A magical museum doorway with paint swirls, gentle geometric shapes, warm gallery lights, and a child-safe art adventure mood.",
    pagesEn: [
      "Mona stood before a museum door with no color at all. A small sign said, 'Paint how today feels, not how perfect looks.'",
      "She mixed yellow for brave, blue for calm, and green for trying again. The door blinked awake like a sleepy painting.",
      "Inside, every frame showed a first attempt: wobbly circles, lopsided houses, stars with extra points. They were all welcome.",
      "Mona learned that art is not a test. It is a door that opens wider when you bring your real colors."
    ],
    pagesAr: [
      "وقفت منى أمام باب متحف بلا لون أبداً. كانت هناك لافتة صغيرة تقول: «ارسمي شعور اليوم، لا شكل الكمال».",
      "مزجت الأصفر للشجاعة، والأزرق للهدوء، والأخضر للمحاولة من جديد. رمش الباب كلوحة ناعسة واستيقظ.",
      "في الداخل، كل إطار عرض محاولة أولى: دوائر متعرجة، بيوت مائلة، نجوم لها أطراف كثيرة. وكلها كانت مرحباً بها.",
      "تعلمت منى أن الفن ليس اختباراً. إنه باب ينفتح أكثر عندما تحمل ألوانك الحقيقية."
    ],
    tapChoicesEn: ["Pick colors", "Draw a door", "Museum quiz"],
    tapChoicesAr: ["اختر ألواناً", "ارسم باباً", "اختبار المتحف"],
  },
  {
    id: "quiet-lantern-breath",
    personaId: "hana_harmony",
    titleEn: "The Quiet Lantern",
    titleAr: "الفانوس الهادئ",
    subtitleEn: "A small lantern teaches a worried hill how to breathe slowly again.",
    subtitleAr: "فانوس صغير يعلّم تلاً قلقاً كيف يتنفس ببطء من جديد.",
    ageBand: "4-6",
    readingMinutes: 3,
    posterClassName: "from-[#1f2937] via-[#5b8e7d] to-[#f6bd60]",
    posterGlyph: "✺",
    backgroundPrompt: "A calm bedtime hill with a glowing lantern, soft green-blue night, warm gold light, and cozy child-safe breathing visuals.",
    pagesEn: [
      "Hana climbed a little hill that was shaking its grass. 'I have too many windy thoughts,' said the hill.",
      "Hana lit a quiet lantern. 'Smell the warm light for two counts. Blow the tiny flame gently for three.' The hill tried once.",
      "The grass stopped rushing. The stars looked closer. The hill was still a hill, but now it had room inside for one calm breath.",
      "Hana left the lantern glowing. It did not make worries disappear. It helped the hill remember: slow can be strong."
    ],
    pagesAr: [
      "صعدت هنا إلى تل صغير كان عُشبه يرتجف. قال التل: «عندي أفكار هوائية كثيرة جداً».",
      "أضاءت هنا فانوساً هادئاً. قالت: «اشم ضوءه الدافئ لعدتين. وانفخ لهبته الصغيرة بلطف لثلاث عدات». جرب التل مرة.",
      "توقف العشب عن الجري. بدت النجوم أقرب. بقي التل تلاً، لكنه وجد داخله مكاناً لنفس هادئ واحد.",
      "تركت هنا الفانوس مضيئاً. لم يجعل القلق يختفي. لكنه ساعد التل أن يتذكر: البطء قد يكون قوياً."
    ],
    tapChoicesEn: ["Breathe with me", "Count colors", "Tiny calm quest"],
    tapChoicesAr: ["تنفس معي", "عدّ الألوان", "مهمة هدوء صغيرة"],
  },
];

export function getChildStoriesForPersona(personaId: PersonaId) {
  return childStories.filter((story) => story.personaId === personaId);
}
