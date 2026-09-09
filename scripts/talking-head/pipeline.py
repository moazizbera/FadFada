"""
Free local talking-head pipeline using Wav2Lip.

Input:  face image + text (or audio)
Output: MP4 video with lip-synced speech

Usage:
    python pipeline.py --image input/face.jpg --text "Hello world" --output output.mp4
    python pipeline.py --image input/face.jpg --audio input/speech.wav --output output.mp4

Dependencies:
    pip install -r requirements.txt
    python download_models.py   (downloads Wav2Lip checkpoint)
"""

import argparse
import os
import sys
import subprocess

from pathlib import Path

import cv2
import numpy as np
import torch

from wav2lip_models import Wav2Lip
from audio_processing import get_mel_chunks, load_audio, melspectrogram
from tts_engine import generate_speech

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
IMG_SIZE = 96
MEL_STEP_SIZE = 16
FPS = 25


def parse_args():
    parser = argparse.ArgumentParser(
        description="Free local talking-head pipeline using Wav2Lip"
    )
    parser.add_argument("--image", required=True, help="Input face portrait (jpg/png)")
    parser.add_argument("--text", help="Text to speak (alternative to --audio)")
    parser.add_argument("--audio", help="Audio file path (alternative to --text)")
    parser.add_argument(
        "--output",
        default="output.mp4",
        help="Output video path",
    )
    parser.add_argument(
        "--checkpoint",
        default=None,
        help="Path to Wav2Lip model checkpoint (downloaded automatically)",
    )
    parser.add_argument(
        "--fps",
        type=float,
        default=FPS,
        help="Output FPS (default: 25)",
    )
    parser.add_argument(
        "--pads",
        nargs=4,
        type=int,
        default=[0, 10, 0, 0],
        help="Face padding (top bottom left right)",
    )
    parser.add_argument(
        "--face-detect-batch",
        type=int,
        default=16,
        help="Batch size for face detection (MTCNN ignores this)",
    )
    parser.add_argument(
        "--wav2lip-batch",
        type=int,
        default=128,
        help="Batch size for Wav2Lip model",
    )
    parser.add_argument(
        "--resize-factor",
        type=int,
        default=1,
        help="Downscale video by this factor before processing",
    )
    parser.add_argument(
        "--tts-voice",
        default="en-US-AndrewNeural",
        help="Edge TTS voice name",
    )
    parser.add_argument(
        "--tts-rate",
        default="+0%",
        help="Edge TTS speech rate",
    )
    parser.add_argument(
        "--tts-pitch",
        default="+0Hz",
        help="Edge TTS speech pitch",
    )
    return parser.parse_args()


def _load_checkpoint(model, path):
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Checkpoint not found: {path}")
    print(f"Loading checkpoint: {path} ...")
    checkpoint = torch.load(path, map_location=lambda storage, loc: storage)
    state_dict = checkpoint.get("state_dict", checkpoint)
    new_sd = {}
    for k, v in state_dict.items():
        new_sd[k.replace("module.", "")] = v
    model.load_state_dict(new_sd)
    return model.to(DEVICE).eval()


def get_checkpoint_path():
    script_dir = Path(__file__).parent
    models_dir = script_dir / "models"
    os.makedirs(models_dir, exist_ok=True)
    ckpt = models_dir / "wav2lip_gan.pth"
    if ckpt.exists():
        return str(ckpt)

    ckpt_url = (
        "https://github.com/Rudrabha/Wav2Lip/releases/download/v1.0/wav2lip_gan.pth"
    )
    alt_url = "https://iiitaphyd-my.sharepoint.com/personal/radrabha_m_research_iiit_ac_in/_layouts/15/download.aspx?share=EdjI7bZlgApMqsVoEUUXpLsBxqXbn5z8VTmoxp55YNDcIA"
    print(f"Checkpoint not found at {ckpt}")
    print(f"Download from: {ckpt_url}")
    print(f"Place it at: {ckpt}")
    print("Or run: python download_models.py")
    return None


def _load_dnn_detector():
    script_dir = Path(__file__).parent
    prototxt = script_dir / "models" / "deploy.prototxt"
    caffemodel = script_dir / "models" / "res10_300x300_ssd_iter_140000.caffemodel"
    if not prototxt.exists() or not caffemodel.exists():
        return None
    return cv2.dnn.readNetFromCaffe(str(prototxt), str(caffemodel))


def _detect_face_opencv(img, detector=None):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return (x, y, x + w, y + h)


def face_detect(images, pads, batch_size, device):
    pady1, pady2, padx1, padx2 = pads
    boxes = []
    face_rect = None

    for img in images:
        if face_rect is None:
            face_rect = _detect_face_opencv(img)
            if face_rect is None:
                raise ValueError(
                    "Face not detected. Ensure the image contains a clear face."
                )
        x1a, y1a, x2a, y2a = face_rect
        x1 = max(0, x1a - padx1)
        y1 = max(0, y1a - pady1)
        x2 = min(img.shape[1], x2a + padx2)
        y2 = min(img.shape[0], y2a + pady2)
        boxes.append([x1, y1, x2, y2])

    boxes = np.array(boxes)
    if len(boxes) > 1:
        boxes = _smooth_boxes(boxes, T=5)
    results = [
        [img[y1:y2, x1:x2], (y1, y2, x1, x2)]
        for img, (x1, y1, x2, y2) in zip(images, boxes)
    ]
    return results


def _smooth_boxes(boxes, T=5):
    smoothed = boxes.copy()
    for i in range(len(boxes)):
        window = boxes[max(0, i - T // 2) : min(len(boxes), i + T // 2 + 1)]
        smoothed[i] = np.mean(window, axis=0)
    return smoothed


def datagen(frames, mel_chunks, face_det_results, static, img_size, batch_size):
    img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []

    for i, m in enumerate(mel_chunks):
        idx = 0 if static else i % len(frames)
        frame_to_save = frames[idx].copy()
        face, coords = face_det_results[idx]
        face = cv2.resize(face, (img_size, img_size))

        img_batch.append(face)
        mel_batch.append(m)
        frame_batch.append(frame_to_save)
        coords_batch.append(coords)

        if len(img_batch) >= batch_size:
            yield _pack_batch(img_batch, mel_batch, frame_batch, coords_batch)
            img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []

    if img_batch:
        yield _pack_batch(img_batch, mel_batch, frame_batch, coords_batch)


def _pack_batch(img_batch, mel_batch, frame_batch, coords_batch):
    img_batch = np.asarray(img_batch)
    mel_batch = np.asarray(mel_batch)

    img_masked = img_batch.copy()
    img_masked[:, IMG_SIZE // 2 :] = 0

    img_batch = np.concatenate((img_masked, img_batch), axis=3) / 255.0
    mel_batch = mel_batch.reshape(len(mel_batch), mel_batch.shape[1], mel_batch.shape[2], 1)

    return img_batch, mel_batch, frame_batch, coords_batch


def make_video_frames(image_path, num_frames, resize_factor=1):
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    if resize_factor > 1:
        h, w = img.shape[:2]
        img = cv2.resize(img, (w // resize_factor, h // resize_factor))

    return [img.copy() for _ in range(num_frames)]


def run_wav2lip(
    full_frames,
    audio_path,
    checkpoint_path,
    pads,
    fps,
    static,
    fd_batch_size,
    wl_batch_size,
    resize_factor,
    output_path,
):
    mel_chunks, _ = get_mel_chunks(audio_path, fps)
    print(f"  Mel chunks: {len(mel_chunks)}")

    full_frames = full_frames[: len(mel_chunks)]
    num_frames = len(full_frames)

    face_det_results = face_detect(full_frames, pads, fd_batch_size, DEVICE)

    model = Wav2Lip()
    _load_checkpoint(model, checkpoint_path)

    frame_h, frame_w = full_frames[0].shape[:2]

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"DIVX")
    temp_avi = output_path.rsplit(".", 1)[0] + "_temp.avi"
    out = cv2.VideoWriter(temp_avi, fourcc, fps, (frame_w, frame_h))

    gen = datagen(
        full_frames, mel_chunks, face_det_results, static, IMG_SIZE, wl_batch_size
    )
    total_batches = int(np.ceil(len(mel_chunks) / wl_batch_size))

    from tqdm import tqdm

    for img_batch, mel_batch, frames, coords in tqdm(gen, total=total_batches, desc=" Wav2Lip"):
        img_t = torch.FloatTensor(np.transpose(img_batch, (0, 3, 1, 2))).to(DEVICE)
        mel_t = torch.FloatTensor(np.transpose(mel_batch, (0, 3, 1, 2))).to(DEVICE)

        with torch.no_grad():
            pred = model(mel_t, img_t)

        pred = pred.cpu().numpy().transpose(0, 2, 3, 1) * 255.0

        for p, f, c in zip(pred, frames, coords):
            y1, y2, x1, x2 = c
            p = cv2.resize(p.astype(np.uint8), (x2 - x1, y2 - y1))
            f[y1:y2, x1:x2] = p
            out.write(f)

    out.release()

    cmd = [
        "ffmpeg", "-y",
        "-i", audio_path,
        "-i", temp_avi,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    os.remove(temp_avi)
    print(f"  Output: {output_path}")


def main():
    args = parse_args()

    if args.text and args.audio:
        print("Specify --text OR --audio, not both.")
        sys.exit(1)
    if not args.text and not args.audio:
        print("Specify either --text or --audio.")
        sys.exit(1)

    ckpt = args.checkpoint or get_checkpoint_path()
    if ckpt is None or not os.path.isfile(ckpt):
        print("ERROR: Wav2Lip checkpoint not found.")
        print("Run: python download_models.py")
        sys.exit(1)

    audio_path = args.audio
    if args.text:
        print(f"Generating speech from text...")
        audio_dir = os.path.dirname(args.output) or "."
        audio_path = os.path.join(audio_dir, "_temp_tts.wav")
        generate_speech(args.text, audio_path, voice=args.tts_voice, rate=args.tts_rate, pitch=args.tts_pitch)

    try:
        import librosa
        duration = librosa.get_duration(path=audio_path)
        print(f"Audio duration: {duration:.2f}s")
    except Exception:
        duration = None

    num_frames = int(np.ceil(duration * args.fps)) if duration else None
    print(f"Preparing frames...")
    full_frames = make_video_frames(args.image, num_frames, args.resize_factor)
    print(f"  Frames: {len(full_frames)} at {args.fps}fps")

    run_wav2lip(
        full_frames,
        audio_path,
        ckpt,
        args.pads,
        args.fps,
        static=True,
        fd_batch_size=args.face_detect_batch,
        wl_batch_size=args.wav2lip_batch,
        resize_factor=args.resize_factor,
        output_path=args.output,
    )

    if args.text and os.path.exists(audio_path):
        os.remove(audio_path)

    print(f"\nDone! Saved to: {args.output}")


if __name__ == "__main__":
    main()
