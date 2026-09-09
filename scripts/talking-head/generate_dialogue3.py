"""Generate Wav2Lip talking heads for the 30-line Gemini-focused dialogue (v9).
Only the speaking speaker's head is generated per line (saves CPU time).
Output: talking-head3/line-XX_speaker.mp4
"""

import os, sys, subprocess, time
from pathlib import Path

PARENT_IMG = r"C:\Users\Device\Downloads\Ahmed_Parent.png"
CHILD_IMG = r"C:\Users\Device\Downloads\Ahmed_child.png"
AUDIO_DIR = Path(r"F:\Projects\Hackathons\FadFada\scripts\demo-output\dialogue3-audio")
OUT_DIR = Path(r"F:\Projects\Hackathons\FadFada\scripts\demo-output\talking-head3")
PIPELINE = Path(__file__).parent / "pipeline.py"
CHECKPOINT = Path(__file__).parent / "models" / "wav2lip_gan.pth"

# line -> speaker (1-based)
speaker_map = {
    1:"parent", 2:"child", 3:"parent", 4:"parent", 5:"child", 6:"parent", 7:"child",
    8:"parent", 9:"child", 10:"parent", 11:"child", 12:"parent", 13:"child",
    14:"parent", 15:"child", 16:"parent", 17:"child", 18:"parent", 19:"child",
    20:"parent", 21:"child", 22:"parent", 23:"child", 24:"parent", 25:"child",
    26:"parent", 27:"child", 28:"parent", 29:"parent", 30:"parent",
}

IMAGES = {"parent": PARENT_IMG, "child": CHILD_IMG}
os.makedirs(OUT_DIR, exist_ok=True)

total_start = time.time()
generated = 0

for line_num in range(1, 31):
    speaker = speaker_map[line_num]
    img = IMAGES[speaker]
    audio = AUDIO_DIR / f"line-{line_num:02d}.mp3"
    output = OUT_DIR / f"line-{line_num:02d}_{speaker}.mp4"

    if output.exists() and output.stat().st_size > 100000:
        print(f"line-{line_num:02d} {speaker}: skip (exists)")
        continue

    print(f"line-{line_num:02d} {speaker}...", end=" ", flush=True)
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
        print(result.stdout[-500:])
        print(result.stderr[-500:])
    generated += 1

total_elapsed = time.time() - total_start
print(f"\nGenerated {generated} videos in {total_elapsed/60:.1f}min")
