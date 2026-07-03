"""Filesystem paths for the layout-planner module (isolated from the CMS app)."""
from pathlib import Path

MODULE_ROOT = Path(__file__).resolve().parent.parent
TRAINING_ROOT = MODULE_ROOT.parent
SCHEMA_DIR = TRAINING_ROOT / "schema"
DATA_DIR = TRAINING_ROOT / "data"
SEQ2SEQ_DIR = DATA_DIR / "seq2seq"
OUTPUTS_DIR = MODULE_ROOT / "outputs"
DEFAULT_MODEL_DIR = OUTPUTS_DIR / "layout-planner-flan-t5-base"
