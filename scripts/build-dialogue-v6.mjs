import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const SCR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\Screens";
const AUDIO = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\dialogue2-audio";
const FACES = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\faces";
const BG = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-phone20\\bg-looped.mp4";
const TEXT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-dialogue-v4\\fadfada-text.png";
const TEXT_AR = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output\\tmp-dialogue-v4\\fadfada-arabic.png";
const OUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output";
const TMP = path.join(OUT, "tmp-dialogue-v6");
const OUTPUT = path.join(OUT, "fadfada-dialogue-v6.mp4");
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

// Speaker labels: 'parent' or 'child'
// 1=parent, 2=child, 3=parent, 4=child, 5=parent, 6=child, 7=parent, 8=child, 9=child, 10=parent,
// 11=child, 12=parent, 13=child, 14=parent, 15=child, 16=parent, 17=child, 18=parent, 19=child,
// 20=parent, 21=child, 22=parent, 23=child, 24=parent, 25=child, 26=parent
const speakerMap = {
  1:"parent",2:"child",3:"parent",4:"child",5:"parent",6:"child",7:"parent",
  8:"child",9:"child",10:"parent",11:"child",12:"parent",13:"child",14:"parent",
  15:"child",16:"parent",17:"child",18:"parent",19:"child",20:"parent",21:"child",
  22:"parent",23:"child",24:"parent",25:"child",26:"parent"
};

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

// Face bubble positions (centered on 1280x720)
// Parent: left side, Child: right side
const P_PARENT = { x: 45, y: 275, cx: 35, cy: 265 }; // face + glow
const P_CHILD  = { x: 1110, y: 275, cx: 1100, cy: 265 };

console.log(`AI bg: ${fs.existsSync(BG)}\n`);

const validScenes = [];

for (let i = 0; i < scenes.length; i++) {
  const sc = scenes[i];
  const screenPath = SCR + "\\" + sc.screen + ".png";
  const audioPath = AUDIO + "\\line-" + String(sc.line).padStart(2, "0") + ".mp3";

  if (!fs.existsSync(screenPath)) { console.log(`Missing ${sc.screen}`); continue; }
  if (!fs.existsSync(audioPath)) { console.log(`Missing line-${String(sc.line).padStart(2,"0")}`); continue; }

  const speaker = speakerMap[sc.line] || "parent";
  const dur = getDuration(audioPath) + 0.15;
  const durStr = dur.toFixed(2);
  const outFile = TMP + "\\scene-" + String(i).padStart(2, "0") + ".mp4";

  // Determine which speaker is active
  const isParentActive = speaker === "parent";

  const finalW = Math.min(Math.round(311 * (660 / 555)), 380);
  const finalH = Math.round(555 * (finalW / 311));
  const padX = Math.round((1280 - finalW) / 2);
  const padY = Math.round((720 - finalH) / 2);

  // Face: active gets glow ring, inactive gets dimmed via pre-processing
  // Input indices: 0=BG, 1=screen, 2=parent, 3=child, 4=glow, 5=text_en, 6=text_ar, 7=audio
  const activeFace = isParentActive ? 2 : 3;
  const inactiveFace = isParentActive ? 3 : 2;
  const activePos = isParentActive ? P_PARENT : P_CHILD;
  const inactivePos = isParentActive ? P_CHILD : P_PARENT;

  const filt = [
    `[0:v]trim=duration=${durStr},setpts=PTS-STARTPTS[bg]`,
    `[bg][5:v]overlay=x=W/2-w/2+250*sin(2*t/5+${i}):y=H/2-h/2+120*cos(t/3+${i}*0.5):format=auto[bg_txt]`,
    `[bg_txt][6:v]overlay=x=W/2-w/2+200*sin(2*t/5+${i+3}):y=H-80-h+40*cos(t/4+${i}+1):format=auto[bg_txt2]`,
    `[1:v]scale=${finalW}:${finalH}:force_original_aspect_ratio=1[phone]`,
    `[bg_txt2][phone]overlay=x=${padX}:y=${padY}:format=auto[img]`,
    `[${inactiveFace}:v]format=rgba,colorchannelmixer=aa=0.35[face_dim]`,
    `[img][face_dim]overlay=x=${inactivePos.x}:y=${inactivePos.y}:format=auto[img2]`,
    `[img2][4:v]overlay=x=${activePos.cx}:y=${activePos.cy}:format=auto[img3]`,
    `[img3][${activeFace}:v]overlay=x=${activePos.x}:y=${activePos.y}:format=auto,format=yuv420p[v]`,
    `[7:a]anull[a]`
  ];

  const inputs = [
    `-stream_loop -1 -i "${BG}"`,
    `-i "${screenPath}"`,
    `-i "${FACES}\\parent_circle.png"`,
    `-i "${FACES}\\child_circle.png"`,
    `-i "${FACES}\\glow-ring.png"`,
    `-i "${TEXT}"`,
    `-i "${TEXT_AR}"`,
    `-i "${audioPath}"`,
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
    console.log("FAILED");
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
