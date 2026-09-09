import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const AUDIO_DIR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\dialogue-audio";
const SCREENS_DIR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\Screens";
const BG = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone20\\bg-looped.mp4";
const TMP = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-dialogue";
const OUTPUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\fadfada-dialogue.mp4";

mkdirSync(TMP, { recursive: true });

// Parent lines use parent screens, child lines use child screens
const screenMap = [
  "F_1.png",   // 01 parent: notices child
  "F_13.png",  // 02 child: workspace
  "F_1.png",   // 03 parent: asks
  "F_2.png",   // 04 child: companions
  "F_1.png",   // 05 parent: explores
  "F_19.png",  // 06 child: companions list
  "F_4.png",   // 07 parent: pulse
  "F_4.png",   // 08 child: pulse
  "F_9.png",   // 09 parent: homework
  "F_14.png",  // 10 child: homework activity
  "F_10.png",  // 11 parent: profiles
  "F_15.png",  // 12 child: story passport
  "F_6.png",   // 13 parent: continuity
  "F_13.png",  // 14 child: workspace
  "F_20.png",  // 15 parent: dashboard
  "F_16.png",  // 16 child: story library
  "F_1.png",   // 17 parent: closing
  "F_1.png",   // 18 child: closing
];

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 120000 });
    return true;
  } catch (e) {
    console.error("  FAILED:", e.stderr?.toString?.().slice(-300) || e.message?.slice(-300));
    return false;
  }
}

function getDuration(file) {
  try { execSync(`"${FF}" -i "${file}"`, { timeout: 10000 }); return 5; }
  catch (e) {
    const parts = [];
    if (e.stderr) parts.push(Buffer.isBuffer(e.stderr) ? e.stderr.toString('utf8') : String(e.stderr));
    if (e.stdout) parts.push(Buffer.isBuffer(e.stdout) ? e.stdout.toString('utf8') : String(e.stdout));
    const raw = parts.join('');
    const m = raw.match(/Duration: 00:00:(\d+\.\d+)/);
    return m ? parseFloat(m[1]) : 5;
  }
}

// Get sorted audio files
const audioFiles = readdirSync(AUDIO_DIR)
  .filter(f => f.startsWith('line-') && f.endsWith('.mp3'))
  .sort()
  .map(f => join(AUDIO_DIR, f));

console.log(`Found ${audioFiles.length} dialogue audio files\n`);

// Build scenes
const sceneFiles = [];
let totalDur = 0;
let bgOffset = 0;

for (let i = 0; i < audioFiles.length; i++) {
  const num = String(i + 1).padStart(2, '0');
  const audioFile = audioFiles[i];
  const screenFile = screenMap[i] || "F_1.png";
  const screenPath = join(SCREENS_DIR, screenFile);
  const sceneFile = join(TMP, `scene-${num}.mp4`);

  // Get audio duration
  const dur = getDuration(audioFile) + 0.5;
  totalDur += dur;

  // Get screen dimensions
  let fw = 310, fh = 560;
  try {
    const probe = execSync(`"${FF}" -i "${screenPath}" 2>&1`, { encoding: 'utf8', timeout: 10000 });
    const wm = probe.match(/,\s*(\d+)x(\d+)\s/);
    if (wm) { fw = parseInt(wm[1]); fh = parseInt(wm[2]); }
  } catch {}

  const xPos = Math.round((1280 - fw) / 2);
  const yPos = Math.round((720 - fh) / 2);

  // Is this a child line? (even index = child)
  const isChild = i % 2 === 1;

  console.log(`  ${num}/18: ${screenFile} (${fw}x${fh}) dur=${dur.toFixed(1)}s ${isChild ? '[CHILD]' : '[PARENT]'}`);

  // Build scene: AI background + phone frame + audio
  const vCmd = `"${FF}" -y -ss ${bgOffset.toFixed(3)} -i "${BG}" ` +
    `-i "${screenPath}" -i "${audioFile}" ` +
    `-filter_complex "[1:v]format=rgba[ph];[0:v][ph]overlay=${xPos}:${yPos}" ` +
    `-t ${dur.toFixed(3)} -r 24 -c:v libx264 -preset fast -crf 23 -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${sceneFile}"`;

  if (run(vCmd) && existsSync(sceneFile)) {
    sceneFiles.push(sceneFile);
  }
  bgOffset += dur;
}

console.log(`\nBuilt ${sceneFiles.length}/${audioFiles.length} scenes`);
console.log(`Total duration: ~${totalDur.toFixed(1)}s`);

// Concatenate
if (sceneFiles.length > 0) {
  console.log("\nConcatenating...");
  const concatList = join(TMP, 'concat.txt');
  writeFileSync(concatList, sceneFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

  const concatCmd = `"${FF}" -y -f concat -safe 0 -i "${concatList}" -c copy -movflags +faststart "${OUTPUT}"`;
  if (run(concatCmd) && existsSync(OUTPUT)) {
    const size = Math.round(statSync(OUTPUT).length / 1024 / 1024);
    const dur = getDuration(OUTPUT);
    console.log(`\nDone! ${OUTPUT}`);
    console.log(`Duration: ${dur.toFixed(1)}s, Size: ${size} MB`);
  }
}
