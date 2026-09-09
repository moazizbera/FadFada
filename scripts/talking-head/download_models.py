import os
import sys
import urllib.request
import zipfile
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"
WAV2LIP_PATH = MODELS_DIR / "wav2lip_gan.pth"

MIRRORS = [
    "https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/wav2lip_gan.pth?download=true",
    "https://huggingface.co/Nekochu/Wav2Lip/resolve/main/wav2lip_gan.pth?download=true",
]


def download_file(url, dest, desc="Downloading"):
    def report(block, blocksize, totalsize):
        downloaded = block * blocksize
        if totalsize > 0:
            pct = min(100, downloaded * 100 / totalsize)
            sys.stdout.write(f"\r  {desc}: {pct:.0f}% ({downloaded//1024}KB / {totalsize//1024}KB)")
            sys.stdout.flush()

    print(f"  {desc}...")
    try:
        urllib.request.urlretrieve(url, dest, reporthook=report)
        print()
        return True
    except Exception as e:
        print(f"\n  Failed: {e}")
        return False


def download_wav2lip():
    if WAV2LIP_PATH.exists():
        size_mb = WAV2LIP_PATH.stat().st_size / (1024 * 1024)
        print(f"Wav2Lip checkpoint already exists: {WAV2LIP_PATH} ({size_mb:.1f} MB)")
        return True

    os.makedirs(MODELS_DIR, exist_ok=True)

    print("Downloading Wav2Lip pretrained model (~400 MB)...")
    print("  Primary source: GitHub Releases")

    for url in MIRRORS:
        print(f"  Trying: {url}")
        if download_file(url, WAV2LIP_PATH, desc="Wav2Lip model"):
            size_mb = WAV2LIP_PATH.stat().st_size / (1024 * 1024)
            print(f"  Downloaded: {WAV2LIP_PATH} ({size_mb:.1f} MB)")
            return True

    print("\nAll download sources failed.")
    print("Manual download: https://github.com/Rudrabha/Wav2Lip#pretrained-models")
    print(f"Save the file as: {WAV2LIP_PATH}")
    return False


def main():
    print(f"Model directory: {MODELS_DIR}")
    os.makedirs(MODELS_DIR, exist_ok=True)

    success = download_wav2lip()

    if success:
        print("\nAll models ready!")
    else:
        print("\nSome downloads failed. See instructions above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
