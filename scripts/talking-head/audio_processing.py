import numpy as np
import librosa
import librosa.filters
from scipy import signal

SAMPLE_RATE = 16000
N_FFT = 800
HOP_SIZE = 200
WIN_SIZE = 800
NUM_MELS = 80
PREEMPHASIS = 0.97
REF_LEVEL_DB = 20
MIN_LEVEL_DB = -100
FMIN = 55
FMAX = 7600
MAX_ABS_VALUE = 4.
MEL_STEP_SIZE = 16


def load_audio(path, sr=SAMPLE_RATE):
    wav, _ = librosa.core.load(path, sr=sr)
    return wav


def preemphasis(wav, k=PREEMPHASIS):
    return signal.lfilter([1, -k], [1], wav)


def _build_mel_basis():
    return librosa.filters.mel(
        sr=SAMPLE_RATE, n_fft=N_FFT, n_mels=NUM_MELS, fmin=FMIN, fmax=FMAX
    )


_mel_basis = None


def _linear_to_mel(spectrogram):
    global _mel_basis
    if _mel_basis is None:
        _mel_basis = _build_mel_basis()
    return np.dot(_mel_basis, spectrogram)


def _amp_to_db(x):
    min_level = np.exp(MIN_LEVEL_DB / 20 * np.log(10))
    return 20 * np.log10(np.maximum(min_level, x))


def _normalize(S):
    return np.clip(
        (2 * MAX_ABS_VALUE) * ((S - MIN_LEVEL_DB) / (-MIN_LEVEL_DB)) - MAX_ABS_VALUE,
        -MAX_ABS_VALUE,
        MAX_ABS_VALUE,
    )


def melspectrogram(wav):
    D = librosa.stft(
        y=preemphasis(wav),
        n_fft=N_FFT,
        hop_length=HOP_SIZE,
        win_length=WIN_SIZE,
        center=True,
    )
    S = _amp_to_db(_linear_to_mel(np.abs(D))) - REF_LEVEL_DB
    return _normalize(S)


def get_mel_chunks(audio_path, fps, mel_step_size=MEL_STEP_SIZE):
    wav = load_audio(audio_path)
    if np.isnan(wav).sum() > 0:
        wav = np.nan_to_num(wav)

    mel = melspectrogram(wav)
    if np.isnan(mel.reshape(-1)).sum() > 0:
        raise ValueError("Mel contains NaN. Add small epsilon noise to audio and retry.")

    mel_chunks = []
    mel_idx_multiplier = 80.0 / fps
    i = 0
    while True:
        start_idx = int(i * mel_idx_multiplier)
        if start_idx + mel_step_size > mel.shape[1]:
            mel_chunks.append(mel[:, mel.shape[1] - mel_step_size :])
            break
        mel_chunks.append(mel[:, start_idx : start_idx + mel_step_size])
        i += 1

    return mel_chunks, mel.shape[1]


def get_audio_duration(audio_path):
    wav, sr = librosa.core.load(audio_path, sr=None)
    return len(wav) / sr
