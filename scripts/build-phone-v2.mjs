import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const SHOT_DIR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\shots-mobile";
const NARR_DIR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\ai-clips\\narration-phone";
const TMP = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone2";
const BG = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone\\bg.mp4";
const OUTPUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\fadfada-phone-demo.mp4";

mkdirSync(TMP, { recursive: true });

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 300000 });
    return true;
  } catch (e) {
    console.error("  FAILED:", e.stderr?.toString().slice(-200));
    return false;
  }
}

function getDuration(file) {
  try { execSync(`"${FF}" -i "${file}"`, { timeout: 10000 }); return 5; }
  catch (e) {
    const raw = Buffer.isBuffer(e.stdout) ? e.stdout.toString('utf8') : String(e.stdout || e.stderr || '');
    const m = raw.match(/Duration: 00:00:(\d+\.\d+)/);
    return m ? parseFloat(m[1]) : 5;
  }
}

// 11 scenes: mobile screenshot + matching narration
const scenes = [
  { shot: "00-signin.png",          narr: "s01.wav", text: "Welcome/Login" },
  { shot: "01-home.png",            narr: "s02.wav", text: "Home screen" },
  { shot: "02-companions.png",      narr: "s03.wav", text: "Companions" },
  { shot: "03b-chat-type.png",      narr: "s04.wav", text: "Typing" },
  { shot: "03c-chat-response.png",  narr: "s05.wav", text: "AI Response" },
  { shot: "04-pulse.png",           narr: "s06.wav", text: "Daily Pulse" },
  { shot: "05-child.png",           narr: "s07.wav", text: "Child section" },
  { shot: "05b-child-companions.png", narr: "s08.wav", text: "Child companions" },
  { shot: "06-parent.png",          narr: "s09.wav", text: "Parent dashboard" },
  { shot: "01-home.png",            narr: "s10.wav", text: "Mobile view" },
  { shot: "07-landing.png",         narr: "s11.wav", text: "Closing" },
];

// Phone: 300x600, screen: 278x545
const PW = 300, PH = 600, SW = 278, SH = 545;
const PAD_X = 11, PAD_TOP = 30;

// Step 1: Create phone mockups
console.log("=== Step 1: Creating phone mockups ===");
scenes.forEach((s, i) => {
  const phoneFile = join(TMP, `phone-${String(i).padStart(2, '0')}.png`);
  const srcFile = join(SHOT_DIR, s.shot);
  if (!existsSync(srcFile)) { console.log(`  ${s.shot} NOT FOUND`); return; }

  // Mobile screenshots are 780x1688 (2x), scale to fit 278x545
  const cmd = `"${FF}" -y ` +
    `-f lavfi -i "color=c=0x1A1A2E:s=${PW}x${PH}:d=0.04:r=24" ` +
    `-i "${srcFile}" ` +
    `-filter_complex "[1:v]scale=${SW}:${SH}:force_original_aspect_ratio=decrease,pad=${SW}:${SH}:(ow-iw)/2:(oh-ih)/2:color=0x1A1A2E,format=rgba[sc];[0:v]format=rgba[bg];[bg][sc]overlay=${PAD_X}:${PAD_TOP}" ` +
    `-frames:v 1 -update 1 "${phoneFile}"`;

  console.log(`  ${i}: ${s.shot}`);
  if (!run(cmd)) {
    // Simple fallback
    run(`"${FF}" -y -i "${srcFile}" -vf "scale=${SW}:${SH}:force_original_aspect_ratio=decrease,pad=${SW}:${SH}:(ow-iw)/2:(oh-ih)/2:color=0x1A1A2E" -frames:v 1 -update 1 "${phoneFile}"`);
  }
});

// Step 2: Build scenes (bg + phone overlay + narration audio)
console.log("\n=== Step 2: Building scenes ===");
const sceneFiles = [];
let bgOffset = 0;

scenes.forEach((s, i) => {
  const phoneFile = join(TMP, `phone-${String(i).padStart(2, '0')}.png`);
  if (!existsSync(phoneFile)) { bgOffset += 5; return; }

  const narrFile = join(NARR_DIR, s.narr);
  const narrDur = existsSync(narrFile) ? getDuration(narrFile) : 5;
  const sceneDur = narrDur + 0.5;
  const sceneFile = join(TMP, `scene-${String(i).padStart(2, '0')}.mp4`);
  const sceneAV = join(TMP, `scene-${String(i).padStart(2, '0')}-av.mp4`);

  const xPos = Math.round((1280 - PW) / 2);
  const yPos = Math.round((720 - PH) / 2);

  console.log(`  ${i}: ${s.text} (${sceneDur.toFixed(1)}s)`);

  // Video: bg segment + phone centered
  const vCmd = `"${FF}" -y -ss ${bgOffset.toFixed(2)} -i "${BG}" -i "${phoneFile}" ` +
    `-filter_complex "[1:v]format=rgba[ph];[0:v][ph]overlay=${xPos}:${yPos}" ` +
    `-t ${sceneDur.toFixed(2)} -r 24 -c:v libx264 -preset fast -crf 23 -an "${sceneFile}"`;
  if (!run(vCmd)) { bgOffset += sceneDur; return; }

  // Audio: add narration
  const aCmd = `"${FF}" -y -i "${sceneFile}" -i "${narrFile}" ` +
    `-c:v copy -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${sceneAV}"`;
  if (!run(aCmd)) { bgOffset += sceneDur; return; }

  sceneFiles.push(sceneAV);
  bgOffset += sceneDur;
});

// Step 3: Concatenate
console.log(`\n=== Step 3: Concatenating ${sceneFiles.length} scenes ===`);
const concatList = join(TMP, 'concat.txt');
writeFileSync(concatList, sceneFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

const concatCmd = `"${FF}" -y -f concat -safe 0 -i "${concatList}" -c copy -movflags +faststart "${OUTPUT}"`;
if (run(concatCmd)) {
  const size = Math.round(statSync(OUTPUT).length / 1024 / 1024);
  const dur = getDuration(OUTPUT);
  console.log(`\nDone! ${OUTPUT}`);
  console.log(`Duration: ${dur.toFixed(1)}s, Size: ${size} MB`);
}
