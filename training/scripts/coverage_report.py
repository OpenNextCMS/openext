#!/usr/bin/env python3
"""Report websiteType × pageName coverage across dataset splits."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.coverage import all_coverage_combos, sample_dedup_key  # noqa: E402
from lib.paths import DATA_DIR  # noqa: E402

MIN_TRAIN_DEFAULT = 3


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def count_by_combo(rows: list[dict]) -> Counter[tuple[str, str]]:
    counts: Counter[tuple[str, str]] = Counter()
    for row in rows:
        _, website_type, page_name = sample_dedup_key(row)
        counts[(website_type, page_name)] += 1
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Coverage matrix for LayoutPlan dataset")
    parser.add_argument("--min-train", type=int, default=MIN_TRAIN_DEFAULT)
    parser.add_argument(
        "--output",
        type=Path,
        default=DATA_DIR / "coverage_matrix.csv",
    )
    args = parser.parse_args()

    splits = {
        "train": load_jsonl(DATA_DIR / "train.jsonl"),
        "eval": load_jsonl(DATA_DIR / "eval.jsonl"),
        "test": load_jsonl(DATA_DIR / "test.jsonl"),
        "all": load_jsonl(DATA_DIR / "validated" / "all.jsonl"),
    }

    train_counts = count_by_combo(splits["train"])
    eval_counts = count_by_combo(splits["eval"])
    test_counts = count_by_combo(splits["test"])
    all_counts = count_by_combo(splits["all"])

    target_combos = set(all_coverage_combos())
    seen_combos = set(all_counts.keys())
    gap_count = 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "websiteType",
                "pageName",
                "train",
                "eval",
                "test",
                "total",
                "status",
            ],
        )
        writer.writeheader()

        for website_type, page_name in sorted(target_combos):
            key = (website_type, page_name)
            train_n = train_counts.get(key, 0)
            eval_n = eval_counts.get(key, 0)
            test_n = test_counts.get(key, 0)
            total_n = all_counts.get(key, 0)

            if total_n == 0:
                status = "MISSING"
                gap_count += 1
            elif train_n < args.min_train:
                status = "LOW_TRAIN"
                gap_count += 1
            else:
                status = "OK"

            writer.writerow(
                {
                    "websiteType": website_type,
                    "pageName": page_name,
                    "train": train_n,
                    "eval": eval_n,
                    "test": test_n,
                    "total": total_n,
                    "status": status,
                }
            )

        for key in sorted(seen_combos - target_combos):
            website_type, page_name = key
            writer.writerow(
                {
                    "websiteType": website_type,
                    "pageName": page_name,
                    "train": train_counts.get(key, 0),
                    "eval": eval_counts.get(key, 0),
                    "test": test_counts.get(key, 0),
                    "total": all_counts.get(key, 0),
                    "status": "EXTRA",
                }
            )

    print(f"Wrote {args.output}")
    print(f"Target combos: {len(target_combos)} | covered in all: {len(seen_combos & target_combos)} | gaps: {gap_count}")
    if gap_count:
        print(f"  (status MISSING or train < {args.min_train})")


if __name__ == "__main__":
    main()
