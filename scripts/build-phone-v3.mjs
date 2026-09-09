import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const SCREENS_DIR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\Screens";
const NARR_DIR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\ai-clips\\narration-phone20-ai";
const TMP = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone20";
const BG = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone20\\bg-looped.mp4";
const OUTPUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\fadfada-phone-demo.mp4";

mkdirSync(TMP, { recursive: true });

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 600000 });
    return true;
  } catch (e) {
    console.error("  FAILED:", e.stderr?.toString?.().slice(-300) || e.message?.slice(-300));
    return false;
  }
}

function getDuration(file) {
  try { execSync(`"${FF}" -i "${file}"`, { timeout: 10000 }); return 5; }
  catch (e) {
    // ffmpeg -i without output writes to stderr
    const parts = [];
    if (e.stderr) parts.push(Buffer.isBuffer(e.stderr) ? e.stderr.toString('utf8') : String(e.stderr));
    if (e.stdout) parts.push(Buffer.isBuffer(e.stdout) ? e.stdout.toString('utf8') : String(e.stdout));
    const raw = parts.join('');
    const m = raw.match(/Duration: 00:00:(\d+\.\d+)/);
    return m ? parseFloat(m[1]) : 5;
  }
}

// 20 frames + 20 narrations
const scenes = [];
for (let i = 1; i <= 20; i++) {
  scenes.push({
    frame: `F_${i}.png`,
    narr: `s${String(i).padStart(2, '0')}.wav`,
    idx: i
  });
}

// Step 1: Measure all narration durations
console.log("=== Step 1: Measuring narration durations ===");
const durations = [];
let totalDur = 0;
scenes.forEach((s, i) => {
  const narrPath = join(NARR_DIR, s.narr);
  const dur = existsSync(narrPath) ? getDuration(narrPath) : 5;
  durations.push(dur);
  totalDur += dur + 0.3; // 0.3s padding between scenes
  console.log(`  ${s.narr}: ${dur.toFixed(2)}s`);
});
console.log(`Total estimated: ${totalDur.toFixed(1)}s (${(totalDur/60).toFixed(1)}min)`);
console.log(`BG available: 180s`);

// Step 2: Build each scene
console.log("\n=== Step 2: Building scenes ===");
const sceneFiles = [];
let bgOffset = 0;

scenes.forEach((s, i) => {
  const framePath = join(SCREENS_DIR, s.frame);
  const narrPath = join(NARR_DIR, s.narr);
  const sceneDur = durations[i] + 0.3;
  const sceneFile = join(TMP, `scene-${String(i).padStart(2, '0')}.mp4`);

  if (!existsSync(framePath)) {
    console.log(`  ${s.frame} NOT FOUND, skipping`);
    bgOffset += sceneDur;
    return;
  }

  // Frame is ~300-350x550-674, center on 1280x720
  // Get frame dimensions
  let fw = 310, fh = 560;
  try {
    const probe = execSync(`"${FF}" -i "${framePath}" 2>&1`, { encoding: 'utf8', timeout: 10000 });
    const wm = probe.match(/,\s*(\d+)x(\d+)\s/);
    if (wm) { fw = parseInt(wm[1]); fh = parseInt(wm[2]); }
  } catch {}

  const xPos = Math.round((1280 - fw) / 2);
  const yPos = Math.round((720 - fh) / 2);

  console.log(`  ${i+1}/20: ${s.frame} (${fw}x${fh}) @ t=${bgOffset.toFixed(1)}s, dur=${sceneDur.toFixed(1)}s`);

  // Build scene: bg segment + phone frame centered
  // Use -ss before -i for fast seek
  const vCmd = `"${FF}" -y -ss ${bgOffset.toFixed(3)} -i "${BG}" -i "${framePath}" ` +
    `-filter_complex "[1:v]format=rgba[ph];[0:v][ph]overlay=${xPos}:${yPos}" ` +
    `-t ${sceneDur.toFixed(3)} -r 24 -c:v libx264 -preset fast -crf 23 -an "${sceneFile}"`;

  if (!run(vCmd)) { bgOffset += sceneDur; return; }

  // Add narration audio
  const sceneAV = join(TMP, `scene-${String(i).padStart(2, '0')}-av.mp4`);
  const aCmd = `"${FF}" -y -i "${sceneFile}" -i "${narrPath}" ` +
    `-c:v copy -c:a aac -ar 44100 -ac 2 -b:a 128k -shortest "${sceneAV}"`;

  if (!run(aCmd)) { bgOffset += sceneDur; return; }

  sceneFiles.push(sceneAV);
  bgOffset += sceneDur;
});

// Step 3: Concatenate
console.log(`\n=== Step 3: Concatenating ${sceneFiles.length} scenes ===`);
if (sceneFiles.length === 0) {
  console.error("No scenes built!");
  process.exit(1);
}

const concatList = join(TMP, 'concat.txt');
writeFileSync(concatList, sceneFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

const concatCmd = `"${FF}" -y -f concat -safe 0 -i "${concatList}" -c copy -movflags +faststart "${OUTPUT}"`;
if (run(concatCmd)) {
  const size = Math.round(statSync(OUTPUT).length / 1024 / 1024);
  const dur = getDuration(OUTPUT);
  console.log(`\nDone! ${OUTPUT}`);
  console.log(`Duration: ${dur.toFixed(1)}s, Size: ${size} MB`);
}
