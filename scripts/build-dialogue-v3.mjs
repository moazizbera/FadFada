import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const SCR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\Screens";
const AUDIO = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\dialogue2-audio";
const BG = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone20\\bg-looped.mp4";
const OUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output";
const TMP = path.join(OUT, "tmp-dialogue-v3");
const OUTPUT = path.join(OUT, "fadfada-dialogue-v3.mp4");
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

// Each entry: [screenshot, dialogue_line_number]
// Dialogue line shows screenshot that matches its content perfectly
const scenes = [
  { screen: "F_1",  line: 1 },  // parent asks about FadFada → main screen
  { screen: "F_1",  line: 2 },  // child says amazing companions → main screen still
  { screen: "F_1",  line: 3 },  // parent describes first screen layout → main screen
  { screen: "F_2",  line: 4 },  // child talks about companion types → companion list
  { screen: "F_3",  line: 5 },  // parent explains Gemini persona system → persona/Gemini screen
  { screen: "F_3",  line: 6 },  // child: storyteller vs helper → personas
  { screen: "F_4",  line: 7 },  // parent: Daily Pulse mood/energy → Daily Pulse
  { screen: "F_5",  line: 8 },  // child: replies become plans/moments → gamification
  { screen: "F_7",  line: 9 },  // child: FadFada remembers continuity → threads/continuity
  { screen: "F_8",  line: 10 }, // parent: parent tools view → parent workspace
  { screen: "F_8",  line: 11 }, // child: upload my worksheet → parent workspace
  { screen: "F_9",  line: 12 }, // parent: upload worksheet image → upload screen
  { screen: "F_10", line: 13 }, // child: no login needed → child profile
  { screen: "F_10", line: 14 }, // parent: child profile setup → profile creation
  { screen: "F_11", line: 15 }, // child: Gemini reads homework → homework transformation
  { screen: "F_11", line: 16 }, // parent: multimodal Gemini → homework detail
  { screen: "F_12", line: 17 }, // child: worksheet becomes game → homework game
  { screen: "F_13", line: 18 }, // parent: switch to child profile → child mode
  { screen: "F_13", line: 19 }, // child: talks like a kid → child mode
  { screen: "F_14", line: 20 }, // parent: safety isolation → safety settings
  { screen: "F_15", line: 21 }, // child: story passport/cards → stories
  { screen: "F_16", line: 22 }, // parent: guided Gemini stories → story interaction
  { screen: "F_18", line: 23 }, // child: choose child companions → companion selection
  { screen: "F_19", line: 24 }, // parent: oversight without reading → parent dashboard
  { screen: "F_20", line: 25 }, // child: my own world but safe → final safety
  { screen: "F_20", line: 26 }, // parent: FadFada summary → final screen
];

console.log(`AI background: ${fs.existsSync(BG)}\n`);

const validScenes = [];

for (let i = 0; i < scenes.length; i++) {
  const sc = scenes[i];
  const screenPath = SCR + "\\" + sc.screen + ".png";
  const audioPath = AUDIO + "\\line-" + String(sc.line).padStart(2, "0") + ".mp3";

  if (!fs.existsSync(screenPath)) { console.log(`Missing screenshot ${sc.screen}`); continue; }
  if (!fs.existsSync(audioPath)) { console.log(`Missing audio line-${String(sc.line).padStart(2, "0")}`); continue; }

  const dur = getDuration(audioPath) + 0.15;
  const durStr = dur.toFixed(2);
  const outFile = TMP + "\\scene-" + String(i).padStart(2, "0") + ".mp4";

  // Use known screenshot dims: F_1 is 311x555, let's probe
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

  const filterStr = `[0:v]trim=duration=${durStr},setpts=PTS-STARTPTS[bg];[1:v]scale=w=${finalW}:h=${finalH}:force_original_aspect_ratio=1[phone];[bg][phone]overlay=x=${padX}:y=${padY}:format=auto,format=yuv420p[v];[2:a]anull[a]`;

  const cmd = `"${FF}" -y -stream_loop -1 -i "${BG}" -i "${screenPath}" -i "${audioPath}" -filter_complex "${filterStr}" -map [v] -map [a] -c:v libx264 -preset medium -crf 22 -b:v 2000k -c:a aac -b:a 128k -t ${durStr} -pix_fmt yuv420p -r 24 "${outFile}"`;

  process.stdout.write(`Scene ${i+1}/${scenes.length}: ${sc.screen} + line-${String(sc.line).padStart(2,"0")} (${durStr}s)... `);

  try {
    execSync(cmd, { stdio: "pipe", timeout: 180000, shell: true });
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
      const kb = Math.round(fs.statSync(outFile).size / 1024);
      console.log(`${kb} KB`);
      validScenes.push(outFile);
    } else {
      console.log("SMALL/MISSING");
    }
  } catch (e) {
    const err = (e.stderr?.toString("utf8") || "").split("\n").filter(l => l.includes("Error") || l.includes("Invalid")).join("; ");
    console.log("FAILED: " + (err || "unknown"));
  }
}

console.log(`\nValid scenes: ${validScenes.length}/${scenes.length}`);

if (validScenes.length === 0) { process.exit(1); }

const concatContent = validScenes.map(f => "file '" + f.replace(/\\/g, '/') + "'").join("\n");
fs.writeFileSync(concatFile, concatContent, "ascii");

console.log("Concatenating...");
execSync(`"${FF}" -y -f concat -safe 0 -i "${concatFile}" -c copy -movflags +faststart "${OUTPUT}"`, { stdio: "pipe", timeout: 120000, shell: true });

if (fs.existsSync(OUTPUT)) {
  const mb = Math.round(fs.statSync(OUTPUT).size / 1024 / 1024);
  console.log(`\nDone! ${OUTPUT} (${mb} MB)`);
  console.log("Duration:");
  execSync(`"${FF}" -i "${OUTPUT}" 2>&1`, { stdio: "inherit", shell: true });
}
