#!/usr/bin/env python3
"""
Turn validated (brief, plan) pairs into the seq2seq training format and split
85/10/5 into train / val / test JSONL.

Each output line:
  {"input_text": "plan layout: <brief>", "target_text": "<minified LayoutPlan JSON>"}

Input JSONL lines must carry at least {"brief": str, "plan": dict}. Each plan is
re-validated with validate_layout_plan (structure-only, CMS rules) and skipped if
invalid, so only clean targets reach the model.

Usage:
  python build_seq2seq.py --in ../../data/validated/pairs.jsonl
  python build_seq2seq.py --in pairs.jsonl --outdir ../../data/seq2seq --seed 42
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from validate_layout_plan import validate_plan  # noqa: E402

DATA_DIR = HERE.parent.parent / "data"
DEFAULT_IN = DATA_DIR / "validated" / "pairs.jsonl"
DEFAULT_OUTDIR = DATA_DIR / "seq2seq"

# 85 / 10 / 5
TRAIN_FRAC, VAL_FRAC = 0.85, 0.10


def to_example(brief: str, plan: dict) -> dict:
    return {
        "input_text": f"plan layout: {brief.strip()}",
        "target_text": json.dumps(plan, separators=(",", ":"), ensure_ascii=False),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Build seq2seq train/val/test JSONL from validated pairs.")
    ap.add_argument("--in", dest="inp", default=str(DEFAULT_IN), help="validated pairs JSONL")
    ap.add_argument("--outdir", default=str(DEFAULT_OUTDIR), help="output dir for splits")
    ap.add_argument("--seed", type=int, default=42, help="shuffle seed")
    ap.add_argument("--no-validate", action="store_true", help="skip re-validation (not recommended)")
    args = ap.parse_args(argv)

    inp = Path(args.inp)
    if not inp.is_file():
        print(f"error: input not found: {inp}")
        return 1

    examples: list[dict] = []
    skipped = 0
    with inp.open(encoding="utf-8") as fh:
        for ln, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            brief, plan = rec.get("brief"), rec.get("plan")
            if not isinstance(brief, str) or not isinstance(plan, dict):
                skipped += 1
                continue
            if not args.no_validate and not validate_plan(plan, f"line {ln}").ok:
                skipped += 1
                continue
            examples.append(to_example(brief, plan))

    if not examples:
        print(f"error: no valid pairs in {inp} (skipped {skipped})")
        return 1

    random.Random(args.seed).shuffle(examples)
    n = len(examples)
    n_train = int(n * TRAIN_FRAC)
    n_val = int(n * VAL_FRAC)
    splits = {
        "train.jsonl": examples[:n_train],
        "val.jsonl": examples[n_train:n_train + n_val],
        "test.jsonl": examples[n_train + n_val:],
    }

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    for fname, rows in splits.items():
        with (outdir / fname).open("w", encoding="utf-8") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"valid pairs: {n}  (skipped {skipped})")
    for fname, rows in splits.items():
        print(f"  {fname:12} {len(rows)}")
    print(f"-> {outdir}")
    if len(splits["train.jsonl"]) < 400:
        print("WARNING: train.jsonl < 400 lines (MISSION target). Generate more briefs/pairs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
