import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const cfg = JSON.parse(readFileSync(join("scripts", "dialogue.json"), "utf8"));
const OUT = join("scripts", "demo-output", "family-flow-dialogue");
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => execSync(`powershell -NoProfile -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: "ignore" });

const tts = (voice, text, file) => {
  for (let i = 1; i <= 6; i++) {
    try {
      execSync(`python -m edge_tts --voice ${voice} --text "${text.replace(/"/g, "'")}" --write-media "${file}"`, { stdio: ["ignore", "ignore", "ignore"], shell: "powershell" });
      return;
    } catch {
      if (i === 6) throw new Error(`edge-tts failed for ${file}`);
      console.log(`retry ${i}/6 ${voice}`);
      sleep(5000 * i);
    }
  }
};

const dur = (p) => {
  const s = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${p}"`, { encoding: "utf8", shell: "powershell" });
  return parseFloat(s.trim());
};

let t = cfg.firstGapSec;
const timeline = [];
for (const line of cfg.lines) {
  const voice = cfg[line.speaker].voice;
  const file = join(OUT, `${line.id}.mp3`);
  tts(voice, line.text, file);
  const d = Number(dur(file).toFixed(3));
  timeline.push({ ...line, file, d, start: +t.toFixed(3), end: +(t + d).toFixed(3) });
  t = t + d + cfg.gapSec;
}
writeFileSync(join(OUT, "timeline.json"), JSON.stringify(timeline, null, 2));
console.log(`total audio: ${(+t - cfg.gapSec).toFixed(2)}s`);
for (const l of timeline) console.log(`${l.id} ${l.speaker} ${l.d}s @${l.start}->${l.end}`);