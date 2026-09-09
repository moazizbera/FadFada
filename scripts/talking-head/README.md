# Talking Head Pipeline

Free, local, open-source pipeline that converts a single portrait image into a realistic talking video with lip sync.

## Pipeline

```
Image ─┐
       ├──► Wav2Lip ──► (optional GFPGAN) ──► MP4
Audio ─┘

Text ──► Edge TTS ──► Audio
```

## Setup

```powershell
# 1. Create venv + install dependencies
.\setup.ps1

# 2. Activate environment
.venv\Scripts\Activate

# 3. Verify model was downloaded
dir models\wav2lip_gan.pth
```

## Usage

### With text input (auto TTS)

```bash
python pipeline.py ^
    --image input\face.jpg ^
    --text "Hello, welcome to my AI video." ^
    --output output.mp4
```

### With audio input

```bash
python pipeline.py ^
    --image input\face.jpg ^
    --audio input\speech.wav ^
    --output output.mp4
```

### Advanced options

```bash
python pipeline.py ^
    --image input\face.jpg ^
    --text "Hello world" ^
    --output output.mp4 ^
    --fps 25 ^
    --pads 0 10 0 0 ^
    --face-detect-batch 8 ^
    --wav2lip-batch 64 ^
    --tts-voice en-US-AndrewNeural ^
    --tts-rate +0%
```

## Parameters

| Argument | Default | Description |
|----------|---------|-------------|
| `--image` | required | Input face portrait (jpg/png) |
| `--text` | — | Text to speak (alternative to --audio) |
| `--audio` | — | Audio file (alternative to --text) |
| `--output` | `output.mp4` | Output video path |
| `--fps` | `25` | Output frame rate |
| `--pads` | `0 10 0 0` | Face padding (top bottom left right) |
| `--face-detect-batch` | `16` | Batch size for face detection |
| `--wav2lip-batch` | `128` | Batch size for Wav2Lip |
| `--resize-factor` | `1` | Downscale video for lower VRAM |
| `--tts-voice` | `en-US-AndrewNeural` | Edge TTS voice |
| `--tts-rate` | `+0%` | Edge TTS speech rate |

## Folder Structure

```
scripts/talking-head/
├── pipeline.py           # Main entry point
├── wav2lip_models.py     # Wav2Lip PyTorch model
├── audio_processing.py   # Mel spectrogram extraction
├── tts_engine.py         # Text-to-speech (Edge TTS)
├── requirements.txt      # Python dependencies
├── download_models.py    # Download pretrained weights
├── setup.ps1             # One-click Windows setup
├── models/
│   └── wav2lip_gan.pth   # Wav2Lip pretrained weights
├── input/                # Input images
└── output/               # Generated videos
```

## How Wav2Lip Works

1. **Face detection** — detects face bounding box in each frame
2. **Mel spectrogram** — converts audio to mel-frequency spectrogram
3. **Chunk sync** — aligns audio mel chunks with video frames
4. **Wav2Lip model** — convolutional encoder-decoder that takes face + audio → lip-synced face
5. **Blend back** — replaces mouth region in original frame

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `face_detection` import error | Install `pip install face_detection` or use CPU `--face-detect-batch 1` |
| CUDA out of memory | Reduce `--wav2lip-batch 32` or `--face-detect-batch 4` or use `--resize-factor 2` |
| Face not detected | Use a clearer portrait, adjust `--pads` |
| No audio in output | Ensure ffmpeg is installed and on PATH |
| NaN in mel spectrogram | Add tiny noise to audio: `import numpy as np; wav += np.random.normal(0, 1e-6, len(wav))` |
