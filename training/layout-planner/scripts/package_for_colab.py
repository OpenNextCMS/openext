#!/usr/bin/env python3
"""Create a zip bundle for Google Colab training (no git required)."""
from __future__ import annotations

import zipfile
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = TRAINING_ROOT.parent
OUT_ZIP = REPO_ROOT / "training-colab-bundle.zip"

INCLUDE = [
    TRAINING_ROOT / "layout-planner",
    TRAINING_ROOT / "data" / "seq2seq",
    TRAINING_ROOT / "schema",
    TRAINING_ROOT / "scripts" / "lib",
]


def main() -> None:
    if OUT_ZIP.exists():
        OUT_ZIP.unlink()

    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for base in INCLUDE:
            if not base.exists():
                print(f"skip missing: {base}")
                continue
            skip_dirs = {"__pycache__", "outputs", ".ipynb_checkpoints"}
            for path in base.rglob("*"):
                if any(part in skip_dirs for part in path.parts):
                    continue
                if path.is_file() and path.suffix != ".pyc":
                    arc = Path("nextcmsmains") / "training" / path.relative_to(TRAINING_ROOT)
                    zf.write(path, arc.as_posix())
                    print(f"  + {arc}")

    mb = OUT_ZIP.stat().st_size / 1e6
    print(f"\nCreated: {OUT_ZIP} ({mb:.1f} MB)")
    print("Upload this file to Google Drive or Colab, then set REPO_ZIP in the notebook.")


if __name__ == "__main__":
    main()
