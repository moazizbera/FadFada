"""
Generate Wav2Lip talking heads for ALL 26 lines for BOTH parent and child faces.
Output: line-XX_parent.mp4 AND line-XX_child.mp4 for each of 26 lines.
"""

import os, sys, subprocess, time
from pathlib import Path

PARENT_IMG = r"C:\Users\Device\Downloads\Ahmed_Parent.png"
CHILD_IMG = r"C:\Users\Device\Downloads\Ahmed_child.png"
AUDIO_DIR = Path(r"F:\Projects\Hackathons\FadFada\scripts\demo-output\dialogue2-audio")
OUT_DIR = Path(r"F:\Projects\Hackathons\FadFada\scripts\demo-output\talking-head")
PIPELINE = Path(__file__).parent / "pipeline.py"
CHECKPOINT = Path(__file__).parent / "models" / "wav2lip_gan.pth"

os.makedirs(OUT_DIR, exist_ok=True)

total_start = time.time()
total = 0

for line_num in range(1, 27):
    for speaker, img in [("parent", PARENT_IMG), ("child", CHILD_IMG)]:
        audio = AUDIO_DIR / f"line-{line_num:02d}.mp3"
        output = OUT_DIR / f"line-{line_num:02d}_{speaker}.mp4"

        if output.exists() and output.stat().st_size > 100000:
            continue

        print(f"  line-{line_num:02d} {speaker}...", end=" ", flush=True)
        start = time.time()

        subprocess.run(
            [sys.executable, str(PIPELINE),
             "--image", img,
             "--audio", str(audio),
             "--output", str(output),
             "--wav2lip-batch", "32",
             "--checkpoint", str(CHECKPOINT)],
            capture_output=True, text=True, timeout=300,
        )

        elapsed = time.time() - start
        size_kb = output.stat().st_size // 1024 if output.exists() else 0
        print(f"{elapsed:.1f}s {size_kb}KB")
        total += 1

total_elapsed = time.time() - total_start
print(f"\nGenerated {total} videos in {total_elapsed:.1f}s ({total_elapsed/60:.1f}min)")
