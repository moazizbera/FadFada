import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const FF = "C:\\Users\\Device\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe";
const OUT = "F:\\Projects\\Hackathons\\FadFada\\scripts\\demo-output";
const RAW = path.join(OUT, "live-app-recorded.mp4");          // silent live app capture, 150s
const SCR = path.join(OUT, "Screens");
const VO = path.join(OUT, "vo-gc");
const TMP = path.join(OUT, "tmp-live-single");
const OUTPUT = path.join(OUT, "fadfada-submission-live-single.mp4");
const segFile = path.join(TMP, "segments.txt");

fs.mkdirSync(TMP, { recursive: true });

// Final timeline (178s):
// S1 live 0-102, S2 card F_9 102-118, S3 live 118-150, S4 card admin 150-166, S5 card F_13 166-178
const segments = [
  { type: "live", src: RAW, start: 0,   dur: 102 },
  { type: "card", img: "F_9.png",        dur: 16 },
  { type: "live", src: RAW, start: 118,  dur: 32 },
  { type: "card", img: "F_21_Admin.png", dur: 16 },
  { type: "card", img: "F_13.png",       dur: 12 },
];

const VO_STARTS = [0, 13, 30, 42, 53, 68, 90, 102, 118, 128, 144, 150, 166];
const norm = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=24,format=yuv420p";
const vfWithFades = (dur) => `${norm},fade=t=in:st=0:d=0.25,fade=t=out:st=${(dur - 0.25).toFixed(2)}:d=0.25`;

console.log("Encoding segments...");
const files = [];
let cursor = 0;
for (let i = 0; i < segments.length; i++) {
  const s = segments[i];
  const outFile = path.join(TMP, `seg-${String(i).padStart(2, "0")}.mp4`);
  let cmd;
  if (s.type === "live") {
    cmd = `"${FF}" -y -ss ${s.start} -t ${s.dur} -i "${s.src}" -vf "${vfWithFades(s.dur)}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 24 "${outFile}"`;
  } else {
    cmd = `"${FF}" -y -loop 1 -framerate 24 -t ${s.dur} -i "${path.join(SCR, s.img)}" -vf "${vfWithFades(s.dur)}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 24 "${outFile}"`;
  }
  try {
    execSync(cmd, { stdio: "pipe", timeout: 180000, shell: true });
    const kb = Math.round(fs.statSync(outFile).size / 1024);
    console.log(`  seg-${i} [${s.type}${s.img ? " " + s.img : " @" + s.start + "s"}] +${s.dur}s -> ${kb}KB`);
    files.push(outFile);
  } catch (e) {
    console.log(`  seg-${i} FAILED: ${(e.stderr || "").toString().slice(-200)}`);
  }
  cursor += s.dur;
}
console.log(`Total video: ${cursor}s`);

fs.writeFileSync(segFile, files.map(f => "file '" + f.replace(/\\/g, "/") + "'").join("\n"), "ascii");
console.log("Concatenating video...");
const concatV = path.join(TMP, "concat.mp4");
execSync(`"${FF}" -y -f concat -safe 0 -i "${segFile}" -c copy "${concatV}"`, { stdio: "pipe", timeout: 180000, shell: true });

console.log("Mixing VO track...");
const voInputs = VO_STARTS.map((s, i) => `-i "${path.join(VO, `s${String(i + 1).padStart(2, "0")}.mp3`)}"`).join(" ");
const voFilters = VO_STARTS.map((s, i) => `[${i}:a]adelay=${s * 1000}|${s * 1000}[v${i}]`).join(";");
const voMix = `[v0][v1][v2][v3][v4][v5][v6][v7][v8][v9][v10][v11][v12]amix=inputs=${VO_STARTS.length}:normalize=0,apad=whole_dur=${cursor},atrim=0:${cursor},afade=t=out:st=${cursor - 1.5}:d=1.5[aout]`;
const voCmd = `"${FF}" -y ${voInputs} -filter_complex "${voFilters};${voMix}" -map "[aout]" -c:a aac -b:a 192k "${path.join(TMP, "vo.m4a")}"`;
execSync(voCmd, { stdio: "pipe", timeout: 180000, shell: true });

console.log("Muxing final...");
execSync(`"${FF}" -y -i "${concatV}" -i "${path.join(TMP, "vo.m4a")}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart "${OUTPUT}"`, { stdio: "pipe", timeout: 180000, shell: true });

if (fs.existsSync(OUTPUT)) {
  const mb = Math.round(fs.statSync(OUTPUT).size / 1024 / 1024);
  console.log(`\nDone! ${OUTPUT} (${mb} MB)`);
}
