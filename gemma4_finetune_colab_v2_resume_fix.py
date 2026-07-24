"""
Final resume-safety patch for gemma4_finetune_colab_v2.ipynb.

Use this file in Colab by either:
1. Uploading it and running: from gemma4_finetune_colab_v2_resume_fix import train_with_safe_resume
2. Or copying the full contents into a notebook cell before the training cell.

Then replace:
    trainer.train(resume_from_checkpoint=str(resume_from) if resume_from else None)

with:
    train_with_safe_resume(trainer, resume_from)

This fixes Adam optimizer resume crashes such as:
    KeyError: 'exp_avg'

Root cause:
    The checkpoint adapter/model weights can be compatible while optimizer.pt is not,
    especially after changing LoRA target modules, batch size, gradient accumulation,
    scheduler settings, or Transformers/Accelerate versions.
"""

from __future__ import annotations

from pathlib import Path
import shutil
from typing import Optional, Tuple, Union

import torch

CheckpointLike = Union[str, Path, None]

TRAINER_STATE_FILES_TO_STRIP = (
    "optimizer.pt",
    "scheduler.pt",
    "trainer_state.json",
    "rng_state.pth",
    "scaler.pt",
)

ADAM_REQUIRED_STATE_KEYS = ("exp_avg", "exp_avg_sq")


def optimizer_state_is_adam_safe(checkpoint_dir: CheckpointLike) -> Tuple[bool, str]:
    """Return whether a checkpoint optimizer state is safe for Adam resume."""
    if checkpoint_dir is None:
        return False, "no checkpoint selected"

    checkpoint_path = Path(checkpoint_dir)
    optimizer_path = checkpoint_path / "optimizer.pt"

    if not checkpoint_path.exists():
        return False, f"checkpoint does not exist: {checkpoint_path}"

    if not optimizer_path.exists():
        return False, "optimizer.pt missing"

    try:
        optimizer_payload = torch.load(optimizer_path, map_location="cpu")
    except Exception as exc:  # noqa: BLE001 - notebook safety guard should report any load issue.
        return False, f"optimizer.pt unreadable: {type(exc).__name__}: {exc}"

    if not isinstance(optimizer_payload, dict):
        return False, "optimizer.pt payload is not a dictionary"

    optimizer_state = optimizer_payload.get("state")
    parameter_groups = optimizer_payload.get("param_groups")

    if not isinstance(optimizer_state, dict) or not optimizer_state:
        return False, "optimizer state is empty"

    if not isinstance(parameter_groups, list) or not parameter_groups:
        return False, "optimizer parameter groups are empty"

    broken_parameter_ids = []

    for parameter_id, parameter_state in optimizer_state.items():
        if not isinstance(parameter_state, dict):
            broken_parameter_ids.append(parameter_id)
            continue

        for required_key in ADAM_REQUIRED_STATE_KEYS:
            value = parameter_state.get(required_key)
            if not torch.is_tensor(value):
                broken_parameter_ids.append(parameter_id)
                break

    if broken_parameter_ids:
        return False, f"Adam slots missing or invalid for {len(broken_parameter_ids)} parameter states"

    return True, "optimizer state looks compatible"


def strip_trainer_resume_state(checkpoint_dir: CheckpointLike) -> Path:
    """Create a weights-only copy of a Trainer checkpoint.

    The returned directory keeps model/adapter/tokenizer files, but removes optimizer,
    scheduler, RNG, scaler, and trainer_state files so Transformers starts a fresh
    optimizer while still loading the useful checkpoint weights.
    """
    if checkpoint_dir is None:
        raise ValueError("checkpoint_dir is required")

    checkpoint_path = Path(checkpoint_dir)

    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

    stripped_path = checkpoint_path.parent / f"{checkpoint_path.name}-weights-only"

    if stripped_path.exists():
        shutil.rmtree(stripped_path)

    shutil.copytree(checkpoint_path, stripped_path)

    for filename in TRAINER_STATE_FILES_TO_STRIP:
        path = stripped_path / filename
        if path.exists():
            path.unlink()

    for rng_path in stripped_path.glob("rng_state_*.pth"):
        rng_path.unlink()

    return stripped_path


def resolve_safe_resume_checkpoint(resume_from: CheckpointLike) -> Optional[str]:
    """Return a Trainer resume path that will not crash on broken Adam state."""
    if resume_from is None:
        print("Resume: no checkpoint selected; starting fresh.")
        return None

    resume_path = Path(resume_from)
    optimizer_ok, optimizer_reason = optimizer_state_is_adam_safe(resume_path)
    print(f"Resume optimizer check: {optimizer_reason}")

    if optimizer_ok:
        print(f"✅ Full trainer resume enabled: {resume_path}")
        return str(resume_path)

    weights_only_path = strip_trainer_resume_state(resume_path)
    print(f"⚠️ Optimizer resume disabled. Loading weights only from: {weights_only_path}")
    print("   A fresh optimizer/scheduler will be created for the current LoRA target modules.")
    return str(weights_only_path)


def train_with_safe_resume(trainer, resume_from: CheckpointLike = None):
    """Run Trainer.train with automatic recovery from incompatible optimizer state."""
    safe_resume_checkpoint = resolve_safe_resume_checkpoint(resume_from)

    try:
        return trainer.train(resume_from_checkpoint=safe_resume_checkpoint)
    except KeyError as exc:
        missing_key = str(exc).strip("'\"")

        if missing_key in ADAM_REQUIRED_STATE_KEYS and resume_from is not None:
            print(f"⚠️ Adam optimizer state is incompatible ({exc}). Retrying weights-only resume.")
            weights_only_path = strip_trainer_resume_state(resume_from)
            return trainer.train(resume_from_checkpoint=str(weights_only_path))

        raise
    except ValueError as exc:
        if "optimizer" in str(exc).lower() and resume_from is not None:
            print(f"⚠️ Optimizer state is incompatible ({exc}). Retrying weights-only resume.")
            weights_only_path = strip_trainer_resume_state(resume_from)
            return trainer.train(resume_from_checkpoint=str(weights_only_path))

        raise


def compute_warmup_steps(train_dataset_length: int, gradient_accumulation_steps: int, num_train_epochs: Union[int, float], warmup_ratio: float = 0.03) -> int:
    """Replacement for deprecated warmup_ratio usage in Transformers TrainingArguments."""
    safe_gradient_accumulation = max(1, int(gradient_accumulation_steps))
    safe_epochs = max(1, int(num_train_epochs))
    updates_per_epoch = max(1, train_dataset_length // safe_gradient_accumulation)
    estimated_update_steps = max(1, updates_per_epoch * safe_epochs)
    return max(1, int(estimated_update_steps * warmup_ratio))


__all__ = [
    "compute_warmup_steps",
    "optimizer_state_is_adam_safe",
    "resolve_safe_resume_checkpoint",
    "strip_trainer_resume_state",
    "train_with_safe_resume",
]
