import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const OUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output";
const V9 = path.join(OUT, "fadfada-dialogue-v9.mp4");                 // Gemini callouts (24fps, 1280x720, has dialogue audio)
const LIVE = path.join(OUT, "fadfada-live-demo-final.mp4");          // real app recording (25fps, 1280x800, has narration audio)
const TMP = path.join(OUT, "tmp-live-merge");
const OUTPUT = path.join(OUT, "fadfada-submission-live-v9.mp4");
const concatFile = path.join(TMP, "segments.txt");

fs.mkdirSync(TMP, { recursive: true });

// (source, startSec, durationSec)
// Live timeline (from live demo): 0-13 login, 13-17 english, 17-30 companions,
// 30-53 worlds+typing, 53-68 first real Gemini response, 68-90 second message,
// 90-102 Daily Pulse, 102-118 children, 118-144 parent, 144-150 mobile+closing.
const segments = [
  { src: V9,   start: 0,      dur: 12 },  // intro: every workflow = Gemini capability
  { src: LIVE, start: 0,      dur: 60 },  // real login, companions, typed msg -> live Gemini response
  { src: V9,   start: 80,     dur: 30 },  // multimodal homework -> structured JSON
  { src: LIVE, start: 60,     dur: 35 },  // second real message + Daily Pulse guided check-in
  { src: V9,   start: 118,    dur: 20 },  // parent/child role separation
  { src: LIVE, start: 95,     dur: 15 },  // save moment + Arabic
  { src: V9,   start: 174,    dur: 15 },  // admin provider/model status + closing
];

const norm = `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=24,format=yuv420p`;
const vf = (t, d) => `${norm},fade=t=in:st=${t}:d=0.3,fade=t=out:st=${(t + d - 0.3).toFixed(2)}:d=0.3`;

console.log("Building normalized segments...");
let total = 0;
const files = [];
for (let i = 0; i < segments.length; i++) {
  const s = segments[i];
  const outFile = path.join(TMP, `seg-${String(i).padStart(2, "0")}.mp4`);
  const cmd = `"${FF}" -y -ss ${s.start} -t ${s.dur} -i "${s.src}" -vf "${vf(0, s.dur)}" -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 160k -ar 44100 -ac 2 -pix_fmt yuv420p -r 24 "${outFile}"`;
  try {
    execSync(cmd, { stdio: "pipe", timeout: 180000, shell: true });
    const kb = Math.round(fs.statSync(outFile).size / 1024);
    console.log(`  seg-${i}: ${s.src.split("/").pop()} @${s.start}s +${s.dur}s -> ${kb}KB`);
    files.push(outFile);
    total += s.dur;
  } catch (e) {
    console.log(`  seg-${i} FAILED: ${(e.stderr || "").toString().slice(-200)}`);
  }
}

if (files.length < 2) { console.error("Not enough segments"); process.exit(1); }

fs.writeFileSync(concatFile, files.map(f => "file '" + f.replace(/\\/g, "/") + "'").join("\n"), "ascii");
console.log(`Total planned: ${total}s (${(total / 60).toFixed(2)} min)`);

console.log("Concatenating...");
execSync(`"${FF}" -y -f concat -safe 0 -i "${concatFile}" -c copy -movflags +faststart "${OUTPUT}"`, { stdio: "pipe", timeout: 180000, shell: true });

if (fs.existsSync(OUTPUT)) {
  const mb = Math.round(fs.statSync(OUTPUT).size / 1024 / 1024);
  console.log(`\nDone! ${OUTPUT} (${mb} MB)`);
}
