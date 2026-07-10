#!/usr/bin/env python3
"""
Merge newly scraped (brief, plan) pairs with the EXISTING seq2seq splits, dedup,
re-validate, and rebuild train/val/test — growing the dataset without losing the
pairs already in training/data/seq2seq/.

Sources combined:
  1. Existing  training/data/seq2seq/{train,val,test}.jsonl   (input_text/target_text)
  2. New       training/data/raw/raw_pairs.jsonl              (scrape output: brief+plan)
     (any extra --raw files may be passed too)

Every plan is re-validated (structure-only CMS rules); invalid plans are dropped.
Duplicate training examples (same input_text + target_text) are removed. The old
splits are backed up to seq2seq/backup_<n>/ before overwriting.

Usage:
  python merge_dataset.py
  python merge_dataset.py --raw ../../data/raw/raw_pairs.jsonl --seed 42
"""
from __future__ import annotations

import argparse
import json
import random
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from validate_layout_plan import validate_plan  # noqa: E402
from build_seq2seq import to_example, TRAIN_FRAC, VAL_FRAC  # noqa: E402

DATA_DIR = HERE.parent.parent / "data"
SEQ_DIR = DATA_DIR / "seq2seq"
DEFAULT_RAW = DATA_DIR / "raw" / "raw_pairs.jsonl"

PREFIX = "plan layout: "


def iter_existing_pairs():
    """Reconstruct (brief, plan) from the current seq2seq splits."""
    for name in ("train.jsonl", "val.jsonl", "test.jsonl"):
        p = SEQ_DIR / name
        if not p.is_file():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            inp, tgt = rec.get("input_text", ""), rec.get("target_text", "")
            brief = inp[len(PREFIX):] if inp.startswith(PREFIX) else inp
            try:
                plan = json.loads(tgt)
            except Exception:
                continue
            yield brief, plan, "existing"


def iter_raw_pairs(path: Path):
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rec = json.loads(line)
        brief, plan = rec.get("brief"), rec.get("plan")
        if isinstance(brief, str) and isinstance(plan, dict):
            yield brief, plan, "scraped"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Merge scraped pairs into the seq2seq splits.")
    ap.add_argument("--raw", action="append", default=None,
                    help="raw pairs JSONL (repeatable); default data/raw/raw_pairs.jsonl")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--outdir", default=str(SEQ_DIR))
    args = ap.parse_args(argv)

    raw_paths = [Path(p) for p in (args.raw or [str(DEFAULT_RAW)])]

    examples: dict[tuple[str, str], dict] = {}   # (input,target) -> example  (dedup)
    counts = {"existing": 0, "scraped": 0, "invalid": 0, "dup": 0}

    def add(brief, plan, origin):
        if not validate_plan(plan, origin).ok:
            counts["invalid"] += 1
            return
        ex = to_example(brief, plan)
        key = (ex["input_text"], ex["target_text"])
        if key in examples:
            counts["dup"] += 1
            return
        examples[key] = ex
        counts[origin] += 1

    for brief, plan, origin in iter_existing_pairs():
        add(brief, plan, origin)
    for rp in raw_paths:
        for brief, plan, origin in iter_raw_pairs(rp):
            add(brief, plan, origin)

    rows = list(examples.values())
    if not rows:
        print("error: no valid examples after merge", file=sys.stderr)
        return 1
    random.Random(args.seed).shuffle(rows)

    n = len(rows)
    n_train, n_val = int(n * TRAIN_FRAC), int(n * VAL_FRAC)
    splits = {
        "train.jsonl": rows[:n_train],
        "val.jsonl": rows[n_train:n_train + n_val],
        "test.jsonl": rows[n_train + n_val:],
    }

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    # back up existing splits before overwriting
    if any((outdir / f).exists() for f in splits):
        i = 0
        while (outdir / f"backup_{i}").exists():
            i += 1
        bdir = outdir / f"backup_{i}"
        bdir.mkdir()
        for f in splits:
            if (outdir / f).exists():
                shutil.copy(outdir / f, bdir / f)
        print(f"backed up old splits -> {bdir}")

    for fname, data in splits.items():
        with (outdir / fname).open("w", encoding="utf-8") as fh:
            for r in data:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"\nmerged examples: {n}  "
          f"(existing kept {counts['existing']}, scraped added {counts['scraped']}, "
          f"dropped {counts['dup']} dup / {counts['invalid']} invalid)")
    for fname, data in splits.items():
        print(f"  {fname:12} {len(data)}")
    print(f"-> {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
