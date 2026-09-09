import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const SCR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\Screens";
const AUDIO = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\dialogue2-audio";
const BG = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone20\\bg-looped.mp4";
const OUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output";
const TMP = path.join(OUT, "tmp-dialogue-v2");
const OUTPUT = path.join(OUT, "fadfada-dialogue-v2.mp4");
const concatFile = path.join(TMP, "scenes.txt");

fs.mkdirSync(TMP, { recursive: true });

function getDuration(file) {
  try {
    const out = execSync(`"${FF}" -i "${file}" 2>&1`, { encoding: "utf8", shell: true });
    const m = out.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
    if (m) return parseInt(m[1])*3600 + parseInt(m[2])*60 + parseInt(m[3]) + parseInt(m[4])/100;
  } catch (e) {
    const s = (e.stderr?.toString("utf8") || e.stdout?.toString("utf8") || "");
    const m = s.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
    if (m) return parseInt(m[1])*3600 + parseInt(m[2])*60 + parseInt(m[3]) + parseInt(m[4])/100;
  }
  return 3;
}

const scenes = [
  { screen: "F_1",  lines: [1, 2] },
  { screen: "F_2",  lines: [3, 4] },
  { screen: "F_3",  lines: [5, 6] },
  { screen: "F_4",  lines: [7] },
  { screen: "F_5",  lines: [8] },
  { screen: "F_7",  lines: [9] },
  { screen: "F_8",  lines: [10, 11] },
  { screen: "F_9",  lines: [12, 13] },
  { screen: "F_10", lines: [14, 15] },
  { screen: "F_11", lines: [16, 17] },
  { screen: "F_13", lines: [18, 19] },
  { screen: "F_14", lines: [20, 21] },
  { screen: "F_15", lines: [22] },
  { screen: "F_17", lines: [23] },
  { screen: "F_18", lines: [24] },
  { screen: "F_19", lines: [25] },
  { screen: "F_20", lines: [26] },
  { screen: "F_20", lines: [], hold: 4 },
];

console.log(`AI background: ${fs.existsSync(BG)}\n`);
const sceneFiles = [];

for (let i = 0; i < scenes.length; i++) {
  const sc = scenes[i];
  const screenPath = SCR + "\\" + sc.screen + ".png";
  if (!fs.existsSync(screenPath)) { console.log(`Missing ${sc.screen}`); continue; }

  const audioFiles = sc.lines
    .map(n => AUDIO + "\\line-" + String(n).padStart(2, "0") + ".mp3")
    .filter(f => fs.existsSync(f));

  let totalDur = sc.hold || 0;
  for (const af of audioFiles) totalDur += getDuration(af);
  if (totalDur < 1) totalDur = 4;
  totalDur += 0.15 * audioFiles.length;
  const durStr = totalDur.toFixed(2);

  const outFile = TMP + "\\scene-" + String(i).padStart(2, "0") + ".mp4";
  sceneFiles.push(outFile);

  // Get screenshot dimensions
  let sw = 311, sh = 555;
  try {
    const pCmd = `"${FF}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${screenPath}"`;
    const pOut = execSync(pCmd, { encoding: "utf8", shell: true });
    const pp = pOut.trim().split(",");
    if (pp.length === 2) { sw = parseInt(pp[0]); sh = parseInt(pp[1]); }
  } catch(e) {}

  const targetH = 660;
  const finalW = Math.min(Math.round(sw * (targetH / sh)), 380);
  const finalH = Math.round(sh * (finalW / sw));
  const padX = Math.round((1280 - finalW) / 2);
  const padY = Math.round((720 - finalH) / 2);

  // Build filter
  const filterParts = [
    `[0:v]trim=duration=${durStr},setpts=PTS-STARTPTS[bg]`,
    `[1:v]scale=w=${finalW}:h=${finalH}:force_original_aspect_ratio=1[phone]`,
    `[bg][phone]overlay=x=${padX}:y=${padY}:format=auto,format=yuv420p[v]`
  ];

  if (audioFiles.length > 0) {
    const audRefs = audioFiles.map((_, idx) => `[${idx + 2}:a]`).join("");
    filterParts.push(`${audRefs}concat=n=${audioFiles.length}:v=0:a=1[a]`);
  }

  const filterStr = filterParts.join(";");

  // Build command - no quotes around map labels, double-quote filter_complex
  const cmd = [
    `"${FF}" -y -stream_loop -1 -i "${BG}" -i "${screenPath}"`,
    ...audioFiles.map(f => `-i "${f}"`),
    `-filter_complex "${filterStr}"`,
    `-map [v]`,
    audioFiles.length > 0 ? `-map [a]` : "",
    `-c:v libx264 -preset medium -crf 22 -b:v 2000k`,
    audioFiles.length > 0 ? `-c:a aac -b:a 128k` : "",
    `-t ${durStr} -pix_fmt yuv420p -r 24 "${outFile}"`
  ].filter(Boolean).join(" ");

  process.stdout.write(`Scene ${i+1}/${scenes.length}: ${sc.screen} (${durStr}s, ${audioFiles.length} audio)... `);

  try {
    execSync(cmd, { stdio: "pipe", timeout: 180000, shell: true });
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
      console.log(Math.round(fs.statSync(outFile).size/1024) + " KB");
    } else {
      console.log("SMALL");
    }
  } catch (e) {
    const err = (e.stderr?.toString("utf8") || "").split("\n").filter(l => l.includes("Error") || l.includes("Invalid")).join("; ");
    console.log("FAILED: " + (err || "unknown"));
  }
}

const valid = sceneFiles.filter(f => fs.existsSync(f) && fs.statSync(f).size > 1000);
console.log(`\nValid scenes: ${valid.length}/${sceneFiles.length}`);

if (valid.length === 0) { process.exit(1); }

const concatContent = valid.map(f => "file '" + f.replace(/\\/g, '/') + "'").join("\n");
fs.writeFileSync(concatFile, concatContent, "ascii");

console.log("Concatenating...");
execSync(`"${FF}" -y -f concat -safe 0 -i "${concatFile}" -c copy -movflags +faststart "${OUTPUT}"`, { stdio: "pipe", timeout: 120000, shell: true });

if (fs.existsSync(OUTPUT)) {
  const mb = Math.round(fs.statSync(OUTPUT).size / 1024 / 1024);
  console.log(`\nDone! ${OUTPUT} (${mb} MB)`);
}
