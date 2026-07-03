#!/usr/bin/env python3
"""Export a random sample of validated records to CSV for manual review."""
from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from pathlib import Path

TRAINING_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TRAINING_ROOT / "scripts"))

from lib.paths import REVIEW_DIR, VALIDATED_DIR  # noqa: E402


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=250)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--input", type=Path, default=VALIDATED_DIR / "all.jsonl")
    parser.add_argument("--source", default=None, help="Filter by source e.g. real-site")
    parser.add_argument(
        "--max-confidence",
        type=float,
        default=None,
        help="Only rows with confidence <= this (for low-confidence review)",
    )
    args = parser.parse_args()

    rows = load_jsonl(args.input)
    if args.source:
        rows = [r for r in rows if r.get("source") == args.source]
    if args.max_confidence is not None:
        rows = [r for r in rows if float(r.get("confidence", 1.0)) <= args.max_confidence]

    if not rows:
        raise SystemExit(f"No rows match filters in {args.input}")

    rng = random.Random(args.seed)
    sample = rows if len(rows) <= args.count else rng.sample(rows, args.count)

    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    suffix = args.source or "all"
    if args.max_confidence is not None:
        suffix += f"_conf_lte_{args.max_confidence}"
    out_path = REVIEW_DIR / f"review_batch_{suffix}.csv"

    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "source",
                "url",
                "confidence",
                "prompt",
                "output_json",
                "approved",
                "corrected_output_json",
                "notes",
            ],
        )
        writer.writeheader()
        for row in sample:
            writer.writerow(
                {
                    "id": row.get("id", ""),
                    "source": row.get("source", ""),
                    "url": row.get("url", ""),
                    "confidence": row.get("confidence", ""),
                    "prompt": row.get("prompt", ""),
                    "output_json": json.dumps(row.get("output", {}), ensure_ascii=False),
                    "approved": "",
                    "corrected_output_json": "",
                    "notes": "",
                }
            )

    print(f"Exported {len(sample)} rows to {out_path}")


if __name__ == "__main__":
    main()
