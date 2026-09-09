"""
Generate Wav2Lip talking head videos for all 26 dialogue lines.
Outputs full-frame MP4 videos, one per line, into the fabric/ directory.
"""

import os, sys, subprocess, time, json
from pathlib import Path

PARENT_IMG = r"C:\Users\Device\Downloads\Ahmed_Parent.png"
CHILD_IMG = r"C:\Users\Device\Downloads\Ahmed_child.png"
AUDIO_DIR = Path(r"F:\Projects\Hackathons\FadFada\scripts\demo-output\dialogue2-audio")
OUT_DIR = Path(r"F:\Projects\Hackathons\FadFada\scripts\demo-output\talking-head")
PIPELINE = Path(__file__).parent / "pipeline.py"
CHECKPOINT = Path(__file__).parent / "models" / "wav2lip_gan.pth"

os.makedirs(OUT_DIR, exist_ok=True)

# Speaker mapping: 26 lines, [parent, child, parent, child, ...]
# line-01 to line-26
SPEAKER = [
    "parent", "child", "parent", "child", "parent", "child", "parent",
    "child", "child", "parent", "child", "parent", "child", "parent",
    "child", "parent", "child", "parent", "child", "parent", "child",
    "parent", "child", "parent", "child", "parent",
]

print(f"Checkpoint: {CHECKPOINT}")
print(f"Exists: {CHECKPOINT.exists()}")
print()

total_start = time.time()

for i in range(26):
    line_num = i + 1
    speaker = SPEAKER[i]
    image = PARENT_IMG if speaker == "parent" else CHILD_IMG
    audio = AUDIO_DIR / f"line-{line_num:02d}.mp3"
    output = OUT_DIR / f"line-{line_num:02d}_{speaker}.mp4"

    if output.exists() and output.stat().st_size > 100000:
        print(f"{line_num:2d}/26: {speaker} — already exists, skipping")
        continue

    print(f"{line_num:2d}/26: {speaker} — generating...", end=" ", flush=True)
    start = time.time()

    result = subprocess.run(
        [
            sys.executable, str(PIPELINE),
            "--image", image,
            "--audio", str(audio),
            "--output", str(output),
            "--wav2lip-batch", "32",
            "--face-detect-batch", "1",
            "--checkpoint", str(CHECKPOINT),
        ],
        capture_output=True, text=True, timeout=300,
    )

    elapsed = time.time() - start

    if result.returncode != 0:
        print(f"FAILED ({elapsed:.1f}s)")
        print(result.stderr[-500:])
    else:
        size_kb = output.stat().st_size // 1024 if output.exists() else 0
        print(f"OK ({elapsed:.1f}s, {size_kb}KB)")

total_elapsed = time.time() - total_start
print(f"\nTotal: {total_elapsed:.1f}s ({total_elapsed/60:.1f}min)")
