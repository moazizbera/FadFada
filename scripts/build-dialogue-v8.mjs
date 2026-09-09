import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const PY = "python";
const SCR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\Screens";
const AUDIO = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\dialogue2-audio";
const FACES = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\faces";
const TH = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\talking-head";
const TEXT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-dialogue-v4\\fadfada-text.png";
const TEXT_AR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-dialogue-v4\\fadfada-arabic.png";
const BASE = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\fadfada-ai-clips-raw.mp4";
const OUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output";
const TMP = path.join(OUT, "tmp-dialogue-v8");
const OUTPUT = path.join(OUT, "fadfada-dialogue-v8.mp4");
const concatFile = path.join(TMP, "scenes.txt");

fs.mkdirSync(TMP, { recursive: true });

const PARENT_FACE = { cx: 542, cy: 645, size: 900 };
const CHILD_FACE  = { cx: 468, cy: 820, size: 880 };

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

const speakerMap = {
  1:"parent",2:"child",3:"parent",4:"child",5:"parent",6:"child",7:"parent",
  8:"child",9:"parent",10:"child",11:"parent",12:"child",13:"parent",14:"child",
  15:"parent",16:"child",17:"parent",18:"child",19:"parent",20:"child",21:"parent",
  22:"child",23:"parent",24:"child",25:"parent",26:"child",27:"parent",28:"parent",
  29:"parent"
};

const scenes = [
  { screen: "F_1",  line: 1 },  { screen: "F_1",  line: 2 },
  { screen: "F_2",  line: 3 },  { screen: "F_2",  line: 4 },
  { screen: "F_3",  line: 5 },  { screen: "F_3",  line: 6 },
  { screen: "F_4",  line: 7 },  { screen: "F_7",  line: 8 },
  { screen: "F_8",  line: 9 },  { screen: "F_8",  line: 10 },
  { screen: "F_9",  line: 11 }, { screen: "F_10", line: 12 },
  { screen: "F_10", line: 13 }, { screen: "F_11", line: 14 },
  { screen: "F_12", line: 15 }, { screen: "F_14", line: 16 },
  { screen: "F_23_Children_Dropdown", line: 17 }, { screen: "F_13", line: 18 },
  { screen: "F_24_Parent_Return_Gate", line: 19 }, { screen: "F_25_Child_New_Chat", line: 20 },
  { screen: "F_26_Child_Daily_Moments", line: 21 }, { screen: "F_15", line: 22 },
  { screen: "F_18", line: 23 }, { screen: "F_19", line: 24 },
  { screen: "F_20", line: 25 }, { screen: "F_27_Child_Draw", line: 26 },
  { screen: "F_28_Child_Music", line: 27 }, { screen: "F_21_Admin", line: 28 },
  { screen: "F_22_Admin", line: 29 },
];

const P_PARENT = { x: 45, y: 275, cx: 35, cy: 265 };
const P_CHILD  = { x: 1110, y: 275, cx: 1100, cy: 265 };

console.log("Step 1: Checking/Generating talking head videos...");
for (const sc of scenes) {
  const speaker = speakerMap[sc.line];
  const thPath = path.join(TH, `line-${String(sc.line).padStart(2,"0")}_${speaker}.mp4`);
  if (!fs.existsSync(thPath) || fs.statSync(thPath).size < 10000) {
    const image = speaker === "parent"
      ? "C:\\Users\\Device\\Downloads\\Ahmed_Parent.png"
      : "C:\\Users\\Device\\Downloads\\Ahmed_child.png";
    const audioPath = path.join(AUDIO, `line-${String(sc.line).padStart(2,"0")}.mp3`);
    console.log(`  Generating line-${String(sc.line).padStart(2,"0")} [${speaker}]...`);
    const genScript = path.join(OUT, "..", "talking-head", "pipeline.py");
    execSync(
      `"${PY}" "${genScript}" --image "${image}" --audio "${audioPath}" --output "${thPath}" --wav2lip-batch 32`,
      { stdio: "pipe", timeout: 300000, shell: true }
    );
    console.log(`    Done (${Math.round(fs.statSync(thPath).size/1024)}KB)`);
  }
}

console.log("\nStep 2: Building scenes...");
const validScenes = [];

let offset = 0;
const BASE_DURATION = 170; // leave margin from the source

for (let i = 0; i < scenes.length; i++) {
  const sc = scenes[i];
  const screenPath = path.join(SCR, sc.screen + ".png");
  const audioPath = path.join(AUDIO, `line-${String(sc.line).padStart(2,"0")}.mp3`);

  if (!fs.existsSync(screenPath) || !fs.existsSync(audioPath)) {
    console.log(`  Missing assets for scene ${i+1}`); continue;
  }

  const speaker = speakerMap[sc.line];
  const isParentActive = speaker === "parent";

  const thPath = path.join(TH, `line-${String(sc.line).padStart(2,"0")}_${speaker}.mp4`);
  if (!fs.existsSync(thPath)) { console.log(`  Missing talking head: ${thPath}`); continue; }

  const dur = getDuration(audioPath) + 0.15;
  const durStr = dur.toFixed(2);
  const outFile = path.join(TMP, `scene-${String(i).padStart(2,"0")}.mp4`);

  if (offset + dur > BASE_DURATION) offset = 0;
  const offsetStr = offset.toFixed(2);
  offset += dur;

  const finalW = Math.min(Math.round(311 * (660 / 555)), 380);
  const finalH = Math.round(555 * (finalW / 311));
  const padX = Math.round((1280 - finalW) / 2);
  const padY = Math.round((720 - finalH) / 2);

  const activeFace = isParentActive ? PARENT_FACE : CHILD_FACE;
  const activePos = isParentActive ? P_PARENT : P_CHILD;
  const geqExpr = "geq=r='r(X,Y)':a='if(lte(sqrt((X-W/2)^2+(Y-H/2)^2),W/2),255,0)'";

  const inputs = [
    `-i "${BASE}"`,                      // 0 = raw AI background
    `-i "${screenPath}"`,                // 1 = per-scene phone screenshot
    `-i "${thPath}"`,                    // 2 = talking head
    `-i "${TEXT}"`,                      // 3 = FadFada text
    `-i "${TEXT_AR}"`,                   // 4 = Arabic text
    `-i "${audioPath}"`,                 // 5 = dialogue audio
  ];

  const filt = [
    `[0:v]trim=start=${offsetStr}:duration=${durStr},setpts=PTS-STARTPTS,pad=1280:720:0:8:black[bg]`,
    `[bg][3:v]overlay=x=W/2-w/2+250*sin(2*t/5+${i}):y=H/2-h/2+120*cos(t/3+${i}*0.5):format=auto[bg_txt]`,
    `[bg_txt][4:v]overlay=x=W/2-w/2+200*sin(2*t/5+${i+3}):y=H-80-h+40*cos(t/4+${i}+1):format=auto[bg_txt2]`,
    `[1:v]scale=${finalW}:${finalH}:force_original_aspect_ratio=1[phone]`,
    `[bg_txt2][phone]overlay=x=${padX}:y=${padY}:format=auto[img]`,
    `[2:v]crop=${activeFace.size}:${activeFace.size}:${activeFace.cx - Math.round(activeFace.size/2)}:${activeFace.cy - Math.round(activeFace.size/2)},scale=110:110,fps=24,format=rgba,${geqExpr}[th_face]`,
    `[img][th_face]overlay=x=${activePos.x}:y=${activePos.y}:format=auto,format=yuv420p[v]`,
    `[5:a]anull[a]`,
  ];

  const filterStr = filt.join(";");
  const cmd = `"${FF}" -y ${inputs.join(" ")} -filter_complex "${filterStr}" -map [v] -map [a] -c:v libx264 -preset medium -crf 22 -b:v 2000k -c:a aac -b:a 128k -t ${durStr} -pix_fmt yuv420p -r 24 "${outFile}"`;

  process.stdout.write(`${i+1}/${scenes.length}: ${sc.screen}+L${String(sc.line).padStart(2,"0")} [${speaker}] `);

  try {
    execSync(cmd, { stdio: "pipe", timeout: 180000, shell: true });
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 1000) {
      console.log(`${Math.round(fs.statSync(outFile).size/1024)}KB`);
      validScenes.push(outFile);
    } else {
      console.log("SMALL");
    }
  } catch (e) {
    const err = (e.stderr?.toString("utf8") || "").slice(-200);
    console.log(`FAILED\n  ${err}`);
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
