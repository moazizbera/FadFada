import asyncio
import os
import sys


def generate_speech(text, output_path, voice="en-US-AndrewNeural", rate="+0%", pitch="+0Hz"):
    try:
        import edge_tts
        asyncio.run(
            edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch).save(output_path)
        )
        return output_path
    except ImportError:
        print("edge-tts not installed. Install with: pip install edge-tts")
        print("Falling back to dummy audio generation...")
        _generate_dummy_audio(output_path)
        return output_path


def _generate_dummy_audio(output_path, duration_s=3.0, sample_rate=16000):
    try:
        import numpy as np
        from scipy.io import wavfile

        t = np.linspace(0, duration_s, int(sample_rate * duration_s), endpoint=False)
        wav = np.sin(2 * np.pi * 220 * t).astype(np.float32)
        wav = (wav * 32767 / max(0.01, np.max(np.abs(wav)))).astype(np.int16)
        wavfile.write(output_path, sample_rate, wav)
        print(f"  Generated {duration_s}s dummy tone at {output_path}")
    except Exception as e:
        print(f"  Could not generate dummy audio: {e}")
        raise
