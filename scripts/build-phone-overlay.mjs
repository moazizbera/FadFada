import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ffmpeg = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const shotDir = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\shots-auth";
const tmpDir = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone";
const output = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\fadfada-phone-demo.mp4";

mkdirSync(tmpDir, { recursive: true });

const shots = [
  { file: "00-login-page.png", start: 14, dur: 7, pos: "right" },
  { file: "03-home-en.png", start: 21, dur: 8, pos: "center" },
  { file: "05-companions-2.png", start: 29, dur: 8, pos: "left" },
  { file: "07-typing.png", start: 37, dur: 7, pos: "right" },
  { file: "10-response-3.png", start: 44, dur: 8, pos: "center" },
  { file: "11-pulse.png", start: 52, dur: 8, pos: "left" },
  { file: "15-child-section.png", start: 60, dur: 7, pos: "right" },
  { file: "17-child-companions-1.png", start: 67, dur: 7, pos: "center" },
  { file: "19-parent-overview.png", start: 74, dur: 7, pos: "left" },
  { file: "21-mobile-home.png", start: 81, dur: 7, pos: "right" },
  { file: "23-closing.png", start: 155, dur: 15, pos: "center" }
];

const posMap = { left: 60, center: 440, right: 820 };
const phoneW = 300, phoneH = 600;
const screenW = 280, screenH = 560;

// Step 1: Create phone-framed PNGs with dark border and shadow
console.log("Creating phone frames with dark border...");
shots.forEach((s, i) => {
  const phoneFile = join(tmpDir, `phone-${String(i).padStart(2,'0')}.png`);
  const srcFile = join(shotDir, s.file);
  
  // Create phone frame: dark rounded rectangle with white inner, screenshot inside
  // Use multi-step: create dark bg, paste screenshot on top with border
  const cmd = `"${ffmpeg}" -y -f lavfi -i "color=c=0x222222:s=${phoneW}x${phoneH}:d=1,format=rgba" ` +
    `-i "${srcFile}" ` +
    `-filter_complex "` +
    `[1:v]scale=${screenW}:${screenH}:force_original_aspect_ratio=decrease,` +
    `pad=${screenW}:${screenH}:(ow-iw)/2:(oh-ih)/2:color=0xF5F5F5[screen];` +
    `[0:v][screen]overlay=(W-w)/2:(H-h)/2` +
    `" ` +
    `-frames:v 1 -format rgba "${phoneFile}"`;
  
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  Phone ${i}: ${s.file} OK`);
  } catch(e) {
    console.error(`  Phone ${i}: FAILED - ${e.stderr?.toString().slice(-200)}`);
  }
});

// Step 2: Build scenes individually, then concat
// For each shot: cut bg segment, overlay phone, output as individual clip
console.log("\nBuilding individual scenes...");
const bgFile = join(tmpDir, 'bg.mp4');
const sceneFiles = [];

// First: add 14s intro (AI clips only, no phone)
const introFile = join(tmpDir, 'scene-intro.mp4');
try {
  execSync(`"${ffmpeg}" -y -i "${bgFile}" -t 14 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${introFile}"`, { stdio: 'pipe' });
  sceneFiles.push(introFile);
  console.log("  Intro (0-14s) OK");
} catch(e) {
  console.error("  Intro FAILED");
}

// Scene clips for each phone overlay
shots.forEach((s, i) => {
  const sceneFile = join(tmpDir, `scene-${String(i).padStart(2,'0')}.mp4`);
  const phoneFile = join(tmpDir, `phone-${String(i).padStart(2,'0')}.png`);
  const xPos = posMap[s.pos];

  // Simple overlay: bg segment + phone PNG at position, no enable expression needed
  const cmd = `"${ffmpeg}" -y -ss ${s.start} -i "${bgFile}" -i "${phoneFile}" ` +
    `-filter_complex "[1:v]format=rgba[ph];[0:v][ph]overlay=${xPos}:60" ` +
    `-t ${s.dur} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${sceneFile}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    sceneFiles.push(sceneFile);
    console.log(`  Scene ${i} (${s.start}s, ${s.pos}) OK`);
  } catch(e) {
    console.error(`  Scene ${i} FAILED: ${e.stderr?.toString().slice(-300)}`);
  }
});

// Bridge: gap between scene 9 (ends at 88s) and scene 10 (starts at 155s)
const bridgeFile = join(tmpDir, 'scene-bridge.mp4');
try {
  execSync(`"${ffmpeg}" -y -ss 88 -i "${bgFile}" -t 67 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${bridgeFile}"`, { stdio: 'pipe' });
  sceneFiles.push(bridgeFile);
  console.log("  Bridge (88-155s) OK");
} catch(e) {
  console.error("  Bridge FAILED");
}

// Step 3: Concatenate all scenes
console.log("\nConcatenating scenes...");
const concatList = join(tmpDir, 'concat-list.txt');
const listContent = sceneFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
writeFileSync(concatList, listContent);

try {
  execSync(`"${ffmpeg}" -y -f concat -safe 0 -i "${concatList}" -c copy -movflags +faststart "${output}"`, { stdio: 'pipe', timeout: 300000 });
  console.log("Concatenation done!");
} catch(e) {
  console.error("Concat FAILED:", e.stderr?.toString().slice(-300));
}

// Verify
try {
  const info = execSync(`"${ffmpeg}" -i "${output}" 2>&1`, { encoding: 'utf8' });
  const durMatch = info.match(/Duration: (\d+:\d+:\d+\.\d+)/);
  const sizeMatch = info.match(/bitrate: (\d+)/);
  console.log(`\nOutput: ${output}`);
  console.log(`Duration: ${durMatch?.[1]}, Bitrate: ${sizeMatch?.[1]} kb/s`);
} catch(e) {}
