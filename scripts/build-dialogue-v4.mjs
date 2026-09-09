import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const FONT = "C\\:/Windows/Fonts/tahoma.ttf";
const SCR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\Screens";
const AUDIO = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\dialogue2-audio";
const BG = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone20\\bg-looped.mp4";
const OUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output";
const TMP = path.join(OUT, "tmp-dialogue-v4");
const OUTPUT = path.join(OUT, "fadfada-dialogue-v4.mp4");
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
  { screen: "F_1",  line: 1 },  { screen: "F_1",  line: 2 },
  { screen: "F_1",  line: 3 },  { screen: "F_2",  line: 4 },
  { screen: "F_3",  line: 5 },  { screen: "F_3",  line: 6 },
  { screen: "F_4",  line: 7 },  { screen: "F_5",  line: 8 },
  { screen: "F_7",  line: 9 },  { screen: "F_8",  line: 10 },
  { screen: "F_8",  line: 11 }, { screen: "F_9",  line: 12 },
  { screen: "F_10", line: 13 }, { screen: "F_10", line: 14 },
  { screen: "F_11", line: 15 }, { screen: "F_11", line: 16 },
  { screen: "F_12", line: 17 }, { screen: "F_13", line: 18 },
  { screen: "F_13", line: 19 }, { screen: "F_14", line: 20 },
  { screen: "F_15", line: 21 }, { screen: "F_16", line: 22 },
  { screen: "F_18", line: 23 }, { screen: "F_19", line: 24 },
  { screen: "F_20", line: 25 }, { screen: "F_20", line: 26 },
];

console.log(`AI bg: ${fs.existsSync(BG)}\n`);

const validScenes = [];

for (let i = 0; i < scenes.length; i++) {
  const sc = scenes[i];
  const screenPath = SCR + "\\" + sc.screen + ".png";
  const audioPath = AUDIO + "\\line-" + String(sc.line).padStart(2, "0") + ".mp3";

  if (!fs.existsSync(screenPath)) { console.log(`Missing ${sc.screen}`); continue; }
  if (!fs.existsSync(audioPath)) { console.log(`Missing line-${String(sc.line).padStart(2,"0")}`); continue; }

  const dur = getDuration(audioPath) + 0.15;
  const durStr = dur.toFixed(2);
  const outFile = TMP + "\\scene-" + String(i).padStart(2, "0") + ".mp4";

  let sw = 311, sh = 555;
  try {
    const pCmd = `"${FF}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${screenPath}"`;
    execSync(pCmd, { encoding: "utf8", shell: true });
  } catch(e) {}

  const finalW = Math.min(Math.round(sw * (660 / sh)), 380);
  const finalH = Math.round(sh * (finalW / sw));
  const padX = Math.round((1280 - finalW) / 2);
  const padY = Math.round((720 - finalH) / 2);

  // Concise filter: bg→trim→drawtext→overlay→format
  const filterArgs = `[0:v]trim=${durStr}:start=0[v0];[v0]drawtext=text=FadFada:fontfile=${FONT}:fontsize=48:fontcolor=white@0.08:x=w/2-text_w/2+200*sin(2*t/5+${i}):y=h/2-text_h/2+100*cos(t/3+${i}*0.5)[v1];[1:v]scale=${finalW}:${finalH}:force_original_aspect_ratio=1[v2];[v1][v2]overlay=${padX}:${padY}:format=auto,format=yuv420p[v3];[2:a]anull[a]`;

  const cmd = `"${FF}" -y -stream_loop -1 -i "${BG}" -i "${screenPath}" -i "${audioPath}" -filter_complex "${filterArgs}" -map [v3] -map [a] -c:v libx264 -preset medium -crf 22 -b:v 2000k -c:a aac -b:a 128k -t ${durStr} -pix_fmt yuv420p -r 24 "${outFile}"`;

  process.stdout.write(`${i+1}/${scenes.length}: ${sc.screen}+L${String(sc.line).padStart(2,"0")} `);

  try {
    execSync(cmd, { stdio: "pipe", timeout: 180000, shell: true });
    const size = fs.existsSync(outFile) ? fs.statSync(outFile).size : 0;
    if (size > 1000) {
      console.log(`${Math.round(size/1024)}KB`);
      validScenes.push(outFile);
    } else {
      const err = execSync(cmd + " 2>&1", { encoding: "utf8", shell: true, timeout: 30000 });
      console.log("SMALL");
    }
  } catch (e) {
    const errLines = (e.stderr?.toString("utf8") || "").split("\n");
    const lastErr = errLines.filter(l => l.includes("Error") || l.includes("Invalid")).slice(-3).join(" | ");
    console.log("ERR: " + (lastErr || errLines.slice(-2).join("")));
    // Retry without drawtext as fallback
    const simpleCmd = `"${FF}" -y -stream_loop -1 -i "${BG}" -i "${screenPath}" -i "${audioPath}" -filter_complex "[0:v]trim=duration=${durStr},setpts=PTS-STARTPTS[v0];[1:v]scale=${finalW}:${finalH}:force_original_aspect_ratio=1[v1];[v0][v1]overlay=${padX}:${padY}:format=auto,format=yuv420p[v2];[2:a]anull[a]" -map [v2] -map [a] -c:v libx264 -preset medium -crf 22 -b:v 2000k -c:a aac -b:a 128k -t ${durStr} -pix_fmt yuv420p -r 24 "${outFile}"`;
    try {
      execSync(simpleCmd, { stdio: "pipe", timeout: 180000, shell: true });
      if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
        console.log(`  fallback OK ${Math.round(fs.statSync(outFile).size/1024)}KB`);
        validScenes.push(outFile);
      }
    } catch(e2) {}
  }
}

console.log(`\nValid: ${validScenes.length}/${scenes.length}`);
if (validScenes.length === 0) { process.exit(1); }

const concatContent = validScenes.map(f => "file '" + f.replace(/\\/g, '/') + "'").join("\n");
fs.writeFileSync(concatFile, concatContent, "ascii");

console.log("Concatenating...");
execSync(`"${FF}" -y -f concat -safe 0 -i "${concatFile}" -c copy -movflags +faststart "${OUTPUT}"`, { stdio: "pipe", timeout: 120000, shell: true });

if (fs.existsSync(OUTPUT)) {
  const mb = Math.round(fs.statSync(OUTPUT).size / 1024 / 1024);
  console.log(`\nDone! ${OUTPUT} (${mb} MB)`);
}
