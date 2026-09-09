import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const SCR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\Screens";
const AUDIO = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\narration-ar";
const TEXT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-dialogue-v4\\fadfada-text.png";
const TEXT_AR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-dialogue-v4\\fadfada-arabic.png";
const BASE = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\fadfada-ai-clips-raw.mp4";
const OUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output";
const TMP = path.join(OUT, "tmp-arabic");
const OUTPUT = path.join(OUT, "fadfada-arabic.mp4");
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
  return 5;
}

const screens = [
  "AR_F_1.png","AR_F_2.png","AR_F_3.png","AR_F_4.png","AR_F_5.png","AR_F_6.png","AR_F_7.png",
  "AR_F_8.png","AR_F_9.png","AR_F_10.png","AR_F_11.png","AR_F_12.png","AR_F_13.png","AR_F_14.png",
  "AR_F_15.png","AR_F_16.png","AR_F_17.png","AR_F_18.png","AR_F_19.png","AR_F_20.png",
  "AR_F_21_Admin.png","AR_F_22_Admin.png","AR_F_23_Children_Dropdown.png","AR_F_24_Parent_Return_Gate.png",
  "AR_F_25_Child_New_Chat.png","AR_F_26_Child_Daily_Moments.png","AR_F_27_Child_Draw.png","AR_F_28_Child_Music.png"
];

console.log("Building Arabic scenes...");
const validScenes = [];
let offset = 0;
const BASE_DURATION = 170;

for (let i = 0; i < screens.length; i++) {
  const screenPath = path.join(SCR, screens[i]);
  const audioPath = path.join(AUDIO, `line-${String(i + 1).padStart(2, "0")}.mp3`);

  if (!fs.existsSync(screenPath) || !fs.existsSync(audioPath)) {
    console.log(`  Missing assets for scene ${i + 1} (${screens[i]})`); continue;
  }

  const dur = getDuration(audioPath) + 0.5;
  const durStr = dur.toFixed(2);
  const outFile = path.join(TMP, `scene-${String(i).padStart(2, "0")}.mp4`);

  if (offset + dur > BASE_DURATION) offset = 0;
  const offsetStr = offset.toFixed(2);
  offset += dur;

  const finalW = Math.min(Math.round(311 * (660 / 555)), 380);
  const finalH = Math.round(555 * (finalW / 311));
  const padX = Math.round((1280 - finalW) / 2);
  const padY = Math.round((720 - finalH) / 2);

  const inputs = [
    `-i "${BASE}"`,      // 0 = raw AI background
    `-i "${screenPath}"`, // 1 = Arabic phone screenshot
    `-i "${TEXT}"`,       // 2 = FadFada text
    `-i "${TEXT_AR}"`,    // 3 = Arabic text
    `-i "${audioPath}"`,  // 4 = narration audio
  ];

  const filt = [
    `[0:v]trim=start=${offsetStr}:duration=${durStr},setpts=PTS-STARTPTS,pad=1280:720:0:8:black[bg]`,
    `[bg][2:v]overlay=x=W/2-w/2+250*sin(2*t/5+${i}):y=H/2-h/2+120*cos(t/3+${i}*0.5):format=auto[bg_txt]`,
    `[bg_txt][3:v]overlay=x=W/2-w/2+200*sin(2*t/5+${i+3}):y=H-80-h+40*cos(t/4+${i}+1):format=auto[bg_txt2]`,
    `[1:v]scale=${finalW}:${finalH}:force_original_aspect_ratio=1[phone]`,
    `[bg_txt2][phone]overlay=x=${padX}:y=${padY}:format=auto,format=yuv420p[v]`,
    `[4:a]anull[a]`,
  ];

  const filterStr = filt.join(";");
  const cmd = `"${FF}" -y ${inputs.join(" ")} -filter_complex "${filterStr}" -map [v] -map [a] -c:v libx264 -preset medium -crf 22 -b:v 2000k -c:a aac -b:a 128k -t ${durStr} -pix_fmt yuv420p -r 24 "${outFile}"`;

  process.stdout.write(`${i + 1}/${screens.length}: ${screens[i]} `);

  try {
    execSync(cmd, { stdio: "pipe", timeout: 180000, shell: true });
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
      console.log(`${Math.round(fs.statSync(outFile).size / 1024)}KB`);
      validScenes.push(outFile);
    } else {
      console.log("SMALL");
    }
  } catch (e) {
    const err = (e.stderr?.toString("utf8") || "").slice(-200);
    console.log(`FAILED\n  ${err}`);
  }
}

console.log(`\nValid: ${validScenes.length}/${screens.length}`);
if (validScenes.length === 0) { process.exit(1); }

const concatContent = validScenes.map(f => "file '" + f.replace(/\\/g, '/') + "'").join("\n");
fs.writeFileSync(concatFile, concatContent, "ascii");

console.log("Concatenating...");
execSync(`"${FF}" -y -f concat -safe 0 -i "${concatFile}" -c copy -movflags +faststart "${OUTPUT}"`, { stdio: "pipe", timeout: 120000, shell: true });

if (fs.existsSync(OUTPUT)) {
  const mb = Math.round(fs.statSync(OUTPUT).size / 1024 / 1024);
  console.log(`\nDone! ${OUTPUT} (${mb} MB)`);
}
