"""Filesystem paths for the training dataset pipeline."""
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
TRAINING_ROOT = _SCRIPTS_DIR.parent
SCHEMA_DIR = TRAINING_ROOT / "schema"
DATA_DIR = TRAINING_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
VALIDATED_DIR = DATA_DIR / "validated"
REVIEW_DIR = DATA_DIR / "review"
SOURCES_DIR = DATA_DIR / "sources"
OUTPUTS_DIR = TRAINING_ROOT / "outputs"
