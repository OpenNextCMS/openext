#!/usr/bin/env python3
"""Stratified 80/10/10 train/eval/test split preserving websiteType × pageName coverage."""
from __future__ import annotations

import argparse
import json
import random
import sys
from collections import defaultdict
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.coverage import sample_dedup_key  # noqa: E402
from lib.paths import DATA_DIR, VALIDATED_DIR  # noqa: E402

SEED = 42


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def write_jsonl(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def combo_key(row: dict) -> tuple[str, str]:
    _, website_type, page_name = sample_dedup_key(row)
    return website_type, page_name


def stratified_split(rows: list[dict], seed: int = SEED) -> tuple[list[dict], list[dict], list[dict]]:
    rng = random.Random(seed)
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in rows:
        groups[combo_key(row)].append(row)

    train: list[dict] = []
    eval_rows: list[dict] = []
    test: list[dict] = []

    for group_rows in groups.values():
        rng.shuffle(group_rows)
        n = len(group_rows)
        if n == 1:
            train.extend(group_rows)
        elif n == 2:
            train.append(group_rows[0])
            eval_rows.append(group_rows[1])
        else:
            eval_n = max(1, int(n * 0.1))
            test_n = max(1, int(n * 0.1))
            if eval_n + test_n >= n:
                eval_n = 1
                test_n = 1 if n >= 3 else 0
            train.extend(group_rows[: n - eval_n - test_n])
            eval_rows.extend(group_rows[n - eval_n - test_n : n - test_n])
            test.extend(group_rows[n - test_n :])

    rng.shuffle(train)
    rng.shuffle(eval_rows)
    rng.shuffle(test)
    return train, eval_rows, test


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()

    src = VALIDATED_DIR / "all.jsonl"
    if not src.exists():
        raise SystemExit(f"Missing {src}; run merge_and_validate.py first")

    rows = load_jsonl(src)
    train, eval_rows, test = stratified_split(rows, seed=args.seed)

    write_jsonl(DATA_DIR / "train.jsonl", train)
    write_jsonl(DATA_DIR / "eval.jsonl", eval_rows)
    write_jsonl(DATA_DIR / "test.jsonl", test)

    print(
        f"Stratified split {len(rows)} samples -> "
        f"train={len(train)} eval={len(eval_rows)} test={len(test)} (seed={args.seed})"
    )


if __name__ == "__main__":
    main()
