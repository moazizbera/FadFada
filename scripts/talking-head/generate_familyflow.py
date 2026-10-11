"""Generate Wav2Lip talking heads for the 10-line Family Flow dialogue.
Only the speaking speaker's head is generated per line.
Output: demo-output/talking-head-ff/lXX_speaker.mp4
"""

import os, sys, subprocess, time, json
from pathlib import Path

PARENT_IMG = r"C:\Users\Device\Downloads\Ahmed_Parent.png"
CHILD_IMG = r"C:\Users\Device\Downloads\Ahmed_child.png"
DLG_DIR = Path(r"F:\Projects\Hackathons\FadFada\scripts\demo-output\family-flow-dialogue")
TIMELINE = DLG_DIR / "timeline.json"
OUT_DIR = Path(r"F:\Projects\Hackathons\FadFada\scripts\demo-output\talking-head-ff")
PIPELINE = Path(__file__).parent / "pipeline.py"
CHECKPOINT = Path(__file__).parent / "models" / "wav2lip_gan.pth"

IMAGES = {"parent": PARENT_IMG, "child": CHILD_IMG}
os.makedirs(OUT_DIR, exist_ok=True)

lines = json.loads(TIMELINE.read_text(encoding="utf-8"))

total_start = time.time()
generated = 0

for l in lines:
    line_id = l["id"]                      # l01..l10
    speaker = l["speaker"]
    img = IMAGES[speaker]
    audio = DLG_DIR / (line_id + ".mp3")
    output = OUT_DIR / f"{line_id}_{speaker}.mp4"

    if output.exists() and output.stat().st_size > 100000:
        print(f"{line_id} {speaker}: skip (exists)")
        continue

    print(f"{line_id} {speaker}...", end=" ", flush=True)
    start = time.time()
    result = subprocess.run(
        [sys.executable, str(PIPELINE),
         "--image", img,
         "--audio", str(audio),
         "--output", str(output),
         "--wav2lip-batch", "32",
         "--checkpoint", str(CHECKPOINT)],
        capture_output=True, text=True, timeout=3600,
    )
    elapsed = time.time() - start
    size_kb = output.stat().st_size // 1024 if output.exists() else 0
    status = "OK" if result.returncode == 0 and size_kb > 100 else "FAIL"
    print(f"{elapsed:.1f}s {size_kb}KB {status}")
    if status == "FAIL":
        print(result.stdout[-800:])
        print(result.stderr[-800:])
    generated += 1

total_elapsed = time.time() - total_start
print(f"\nGenerated {generated} videos in {total_elapsed/60:.1f}min")
