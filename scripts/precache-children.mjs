/**
 * Pre-cache talking head videos for child personas.
 * Runs overnight before the demo.
 *
 * Usage: node scripts/precache-children.mjs
 *        node scripts/precache-children.mjs --persona zain_kg_explorer  (single persona)
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const PIPELINE = join(__dirname, "talking-head", "pipeline.py");
const CHECKPOINT = join(__dirname, "talking-head", "models", "wav2lip_gan.pth");
const PUBLIC_DIR = join(PROJECT_ROOT, "public");
const PRECACHE_DIR = join(PUBLIC_DIR, "precache");

const PERSONAS = [
  { id: "zain_kg_explorer", avatar: "zain_avatar.png", voice: "ar-SA-HamedNeural", rate: "+22%", pitch: "+80Hz" },
  { id: "rami_riddles", avatar: "rami_riddles.png", voice: "ar-SA-HamedNeural", rate: "+26%", pitch: "+70Hz" },
  { id: "faris_focus", avatar: "faris_focus.png", voice: "ar-SA-HamedNeural", rate: "+16%", pitch: "+65Hz" },
  { id: "tariq_tales", avatar: "tariq_tales.png", voice: "ar-SA-HamedNeural", rate: "+13%", pitch: "+55Hz" },
  { id: "sami_space", avatar: "sami_space.png", voice: "ar-SA-HamedNeural", rate: "+17%", pitch: "+45Hz" },
  { id: "bassel_builder", avatar: "bassel_builder.png", voice: "ar-SA-HamedNeural", rate: "+20%", pitch: "+50Hz" },
  { id: "yousef_why", avatar: "yousef_why.png", voice: "ar-EG-ShakirNeural", rate: "+22%", pitch: "+60Hz" },
  { id: "kareem_kick", avatar: "kareem_kick.png", voice: "ar-EG-ShakirNeural", rate: "+25%", pitch: "+70Hz" },
  { id: "zack_zoo", avatar: "zack_zoo.png", voice: "ar-AE-HamdanNeural", rate: "+19%", pitch: "+55Hz" },
  { id: "deema_drama", avatar: "deema_drama.png", voice: "ar-SA-ZariyahNeural", rate: "+21%", pitch: "+75Hz" },
  { id: "nour_nature", avatar: "nour_nature.png", voice: "ar-SA-ZariyahNeural", rate: "+24%", pitch: "+80Hz" },
  { id: "amina_manners", avatar: "amina_manners.png", voice: "ar-SA-ZariyahNeural", rate: "+18%", pitch: "+60Hz" },
  { id: "hana_harmony", avatar: "hana_harmony.png", voice: "ar-SA-ZariyahNeural", rate: "+14%", pitch: "+50Hz" },
  { id: "mona_museum", avatar: "mona_museum.png", voice: "ar-SA-ZariyahNeural", rate: "+16%", pitch: "+55Hz" },
  { id: "amal_empathy", avatar: "amal_empathy.png", voice: "ar-SA-ZariyahNeural", rate: "+17%", pitch: "+65Hz" },
  { id: "leila_logic", avatar: "leila_logic.png", voice: "ar-EG-SalmaNeural", rate: "+21%", pitch: "+65Hz" },
  { id: "salma_sound", avatar: "salma_sound.png", voice: "ar-EG-SalmaNeural", rate: "+14%", pitch: "+60Hz" },
];

const PHRASES = {
  greeting: ["مرحباً! كيف حالك اليوم؟", "Hello! How are you today?", "أهلاً وسهلاً بك!", "أهلاً بك!", "صباح الخير!", "Hello!"],
  motivation: ["أنت بطل! استمر في المحاولة!", "You're amazing! Keep trying!", "واو! أحسنت!", "عمل رائع!", "مذهل! استمر!", "Great job!"],
  praise: ["أحسنت!", "ممتاز!", "رائع!", "برافو!", "واو!", "Awesome!"],
  encouragement: ["لا بأس! حاول مرة أخرى!", "لا تستسلم!", "أنت تستطيع!", "حاول مرة أخرى!", "It's okay, try again!", "You can do it!"],
  affirmation: ["نعم!", "صحيح!", "تمام!", "بالضبط!", "فكرة رائعة!", "That's right!"],
  question: ["هل تريد أن نلعب معاً؟", "Shall we play together?", "ما رأيك في تجربة شيء جديد؟", "هل تريد أن نرسم؟", "ما رأيك؟", "What do you think?"],
  learning: ["هل تعلم؟ تعلم الأشياء الجديدة ممتع!", "Did you know? Learning is fun!", "لنكتشف شيئاً جديداً معاً!", "هل تعلم؟", "التعلم ممتع!", "Let's discover something new!"],
  wonder: ["لحظة!", "دعني أفكر!", "هممم...", "One moment!", "Let me think!"],
  empathy: ["لا تقلق!", "أفهم شعورك!", "كل شيء سيكون بخير!", "أنا معك!", "Don't worry!", "I'm here with you!"],
  farewell: ["إلى اللقاء! أراك قريباً!", "Goodbye! See you soon!", "كان وقتاً جميلاً معك!", "أراك قريباً!", "إلى اللقاء!", "See you soon!"],
  "call-to-action": ["هيا نلعب!", "هيا نرسم!", "هيا نغني!", "هيا نكتشف!", "Let's play!", "Let's draw!"],
};

const args = process.argv.slice(2);
const filterPersona = args.includes("--persona") ? args[args.indexOf("--persona") + 1] : null;

function simpleHash(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}

async function main() {
  if (!existsSync(CHECKPOINT)) {
    console.error(`ERROR: Wav2Lip checkpoint not found at ${CHECKPOINT}`);
    console.error("Run: python scripts/talking-head/download_models.py");
    process.exit(1);
  }

  const manifest = {};
  const Python = "python";

  for (const persona of PERSONAS) {
    if (filterPersona && persona.id !== filterPersona) continue;

    const personaDir = join(PRECACHE_DIR, persona.id);
    mkdirSync(personaDir, { recursive: true });
    manifest[persona.id] = [];

    const avatarPath = join(PROJECT_ROOT, "public", "avatars", persona.avatar);
    if (!existsSync(avatarPath)) {
      console.warn(`  WARN: Avatar not found for ${persona.id} at ${avatarPath}, skipping`);
      continue;
    }

    for (const [category, phrases] of Object.entries(PHRASES)) {
      for (const text of phrases) {
        const hash = simpleHash(text);
        const outputName = `${hash}.mp4`;
        const outputPath = join(personaDir, outputName);

        if (existsSync(outputPath) && outputPath.endsWith(".mp4")) {
          const { statSync } = await import("fs");
          const stat = statSync(outputPath);
          if (stat.size > 50000) {
            console.log(`  ${persona.id}/${outputName} — already exists, skipping`);
            manifest[persona.id].push({ text, hash, output: `/precache/${persona.id}/${outputName}` });
            continue;
          }
        }

        console.log(`${persona.id}/${category}: ${text.slice(0, 40)}...`);

        try {
          execFileSync(Python, [
            PIPELINE,
            "--image", avatarPath,
            "--text", text,
            "--output", outputPath,
            "--checkpoint", CHECKPOINT,
            "--wav2lip-batch", "32",
            "--face-detect-batch", "1",
            "--tts-voice", persona.voice,
            "--tts-rate", persona.rate,
            "--tts-pitch", persona.pitch,
          ], {
            stdio: "inherit",
            timeout: 300_000,
          });

          manifest[persona.id].push({ text, hash, output: `/precache/${persona.id}/${outputName}` });
        } catch (err) {
          console.error(`  FAILED: ${err.message}`);
        }

        console.log();
      }
    }
  }

  const manifestPath = join(PRECACHE_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to ${manifestPath}`);

  const total = Object.values(manifest).reduce((sum, items) => sum + items.length, 0);
  console.log(`Total pre-cached videos: ${total}`);
}

main().catch(console.error);
